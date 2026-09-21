import { json, verifyToken } from "../_lib/util.js";
import { verifyRun, minPlayMs, validNick, CID_RE, isBetter } from "../_lib/game.js";

const MAX_AGE_MS = 2 * 3600 * 1000;

async function rankOf(db, scope, r) {
  const row = await db.prepare(
    `SELECT COUNT(*) AS n FROM best WHERE scope=?1 AND (
       day>?2 OR (day=?2 AND score>?3) OR (day=?2 AND score=?3 AND perfect>?4)
       OR (day=?2 AND score=?3 AND perfect=?4 AND ts<?5))`
  ).bind(scope, r.day, r.score, r.perfect, r.ts).first();
  return (row ? row.n : 0) + 1;
}

// POST /api/submit  { token, cid, nick, presses:[초,...] }
// 서버가 날짜 시드 패턴으로 판정을 다시 계산합니다. 클라이언트가 보낸 점수는 사용하지 않습니다.
export async function onRequestPost({ request, env }) {
  if (!env.SESSION_SECRET || !env.DB) return json({ error: "server_not_configured" }, 500);
  let body; try { body = await request.json(); } catch (e) { return json({ error: "bad_request" }, 400); }

  const tok = await verifyToken(env.SESSION_SECRET, body.token);
  if (!tok) return json({ error: "invalid_token" }, 400);
  const cid = String(body.cid || "");
  if (!CID_RE.test(cid) || cid !== tok.c) return json({ error: "invalid_token" }, 400);

  const now = Date.now();
  if (now < tok.t || now - tok.t > MAX_AGE_MS) return json({ error: "expired" }, 400);

  const nickErr = validNick(body.nick);
  if (nickErr) return json({ error: "nick", message: nickErr }, 400);
  const nick = String(body.nick).trim();

  const run = verifyRun(tok.d, body.presses);
  if (!run) return json({ error: "invalid_run" }, 400);
  if (now - tok.t < minPlayMs(body.presses) * 0.9) return json({ error: "too_fast" }, 400);

  const db = env.DB;
  const result = {};
  for (const scope of [tok.d, "ALL"]) {
    const old = await db.prepare("SELECT day,score,perfect,ts FROM best WHERE scope=?1 AND cid=?2").bind(scope, cid).first();
    let ts = now;
    if (!old || isBetter(run, old)) {
      await db.prepare(
        `INSERT INTO best (scope,cid,nick,day,score,perfect,great,good,grades,ts) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)
         ON CONFLICT(scope,cid) DO UPDATE SET nick=?3,day=?4,score=?5,perfect=?6,great=?7,good=?8,grades=?9,ts=?10`
      ).bind(scope, cid, nick, run.day, run.score, run.perfect, run.great, run.good, run.grades, now).run();
    } else {
      ts = old.ts;
      await db.prepare("UPDATE best SET nick=?1 WHERE scope=?2 AND cid=?3").bind(nick, scope, cid).run();
    }
    const cur = (!old || isBetter(run, old)) ? run : old;
    result[scope === "ALL" ? "all" : "daily"] = { rank: await rankOf(db, scope, { day: cur.day, score: cur.score, perfect: cur.perfect, ts }) };
  }
  return json({ ok: true, day: run.day, score: run.score, perfect: run.perfect, daily: result.daily, all: result.all });
}

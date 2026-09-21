import { json } from "../_lib/util.js";
import { kstDate, CID_RE } from "../_lib/game.js";

// GET /api/rank?scope=daily|all&limit=30&cid=내기기ID
export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: "server_not_configured" }, 500);
  const u = new URL(request.url);
  const scope = u.searchParams.get("scope") === "all" ? "ALL" : kstDate();
  const limit = Math.min(30, Math.max(1, parseInt(u.searchParams.get("limit") || "30", 10) || 30));
  const cid = u.searchParams.get("cid") || "";
  const db = env.DB;

  const list = await db.prepare(
    "SELECT cid,nick,day,score,perfect FROM best WHERE scope=?1 ORDER BY day DESC, score DESC, perfect DESC, ts ASC LIMIT ?2"
  ).bind(scope, limit).all();
  const total = await db.prepare("SELECT COUNT(*) AS n FROM best WHERE scope=?1").bind(scope).first();

  const rows = (list.results || []).map((r, i) => ({
    rank: i + 1, nick: r.nick, day: r.day, score: r.score, perfect: r.perfect, me: r.cid === cid
  }));

  let me = null;
  if (CID_RE.test(cid)) {
    const m = await db.prepare("SELECT day,score,perfect,ts FROM best WHERE scope=?1 AND cid=?2").bind(scope, cid).first();
    if (m) {
      const c = await db.prepare(
        `SELECT COUNT(*) AS n FROM best WHERE scope=?1 AND (
           day>?2 OR (day=?2 AND score>?3) OR (day=?2 AND score=?3 AND perfect>?4)
           OR (day=?2 AND score=?3 AND perfect=?4 AND ts<?5))`
      ).bind(scope, m.day, m.score, m.perfect, m.ts).first();
      me = { rank: (c ? c.n : 0) + 1 };
    }
  }
  return json({ scope: scope === "ALL" ? "all" : "daily", date: kstDate(), total: total ? total.n : 0, rows, me });
}

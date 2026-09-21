import { json, signToken } from "../_lib/util.js";
import { kstDate, CID_RE } from "../_lib/game.js";

// POST /api/start  { cid }  →  { token, date }
// 판이 시작될 때 호출합니다. 서버 기준 날짜(한국시간)와 시작 시각이 서명되어 돌아옵니다.
export async function onRequestPost({ request, env }) {
  if (!env.SESSION_SECRET) return json({ error: "server_not_configured" }, 500);
  let body; try { body = await request.json(); } catch (e) { return json({ error: "bad_request" }, 400); }
  const cid = String(body && body.cid || "");
  if (!CID_RE.test(cid)) return json({ error: "bad_cid" }, 400);
  const t = Date.now(), d = kstDate(t);
  const token = await signToken(env.SESSION_SECRET, { c: cid, d, t });
  return json({ token, date: d });
}

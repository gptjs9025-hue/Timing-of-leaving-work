// 퇴근 타이밍 — 서버/클라이언트 공용 게임 규칙 (기획서 v2.0)
// 클라이언트(public/index.html)의 규칙과 반드시 동일해야 합니다.

export const DAYS = 20;
export const SPEED = [60,65,70,75,80,85,90,95,100,105,110,113,117,121,125,130,135,140,145,150]; // 초당 %
export const PTS = { P: 300, G: 200, O: 100 };
export const BONUS = { 3: 300, 5: 500, 10: 1000 };
export const PREP_MS = 500;
export const FB_MS = 700;
export const MIN_REACTION_SEC = 0.12;

export function widthFor(d) { return d <= 3 ? .25 : d <= 6 ? .23 : d <= 10 ? .21 : d <= 15 ? .19 : d <= 19 ? .17 : .16; }
export function limitFor(d) { return d <= 6 ? 8 : d <= 15 ? 7 : 6; }

export function kstDate(ms = Date.now()) { return new Date(ms + 9 * 3600 * 1000).toISOString().slice(0, 10); }

function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function makePattern(dateKey) {
  const rng = mulberry(hashStr("toe-geun:" + dateKey)), out = [null], m = 0.04;
  for (let d = 1; d <= DAYS; d++) { const w = widthFor(d); out.push(m + w / 2 + rng() * (1 - w - 2 * m)); }
  return out;
}
export function tri(x) { const m = x % 2; return m <= 1 ? m : 2 - m; }
export function judge(pos, center, width) {
  const off = Math.abs(pos - center) / width;
  if (off <= 0.10 + 1e-9) return "P";
  if (off <= 0.30 + 1e-9) return "G";
  if (off <= 0.50 + 1e-9) return "O";
  return null;
}
export function calcScore(grades) {
  let s = 0, streak = 0; const got = {};
  for (const g of grades) {
    s += PTS[g] || 0;
    if (g === "P") { streak++; if (BONUS[streak] && !got[streak]) { got[streak] = 1; s += BONUS[streak]; } } else streak = 0;
  }
  return s;
}

// presses[i] = DAY(i+1)에서 게이지가 움직이기 시작한 뒤 SPACE를 누르기까지 걸린 시간(초).
// 모든 판정이 성공이어야 유효합니다. 실패한 마지막 판은 기록에 포함되지 않습니다.
export function verifyRun(dateKey, presses) {
  if (!Array.isArray(presses) || presses.length < 1 || presses.length > DAYS) return null;
  const centers = makePattern(dateKey);
  let grades = "";
  for (let i = 0; i < presses.length; i++) {
    const d = i + 1, sec = presses[i];
    if (typeof sec !== "number" || !Number.isFinite(sec)) return null;
    if (sec < MIN_REACTION_SEC || sec >= limitFor(d)) return null;
    const g = judge(tri(sec * SPEED[d - 1] / 100), centers[d], widthFor(d));
    if (!g) return null;
    grades += g;
  }
  const count = (c) => grades.split(c).length - 1;
  return { day: presses.length, grades, score: calcScore(grades), perfect: count("P"), great: count("G"), good: count("O") };
}
// 실제로 플레이하는 데 최소한 필요한 시간(ms): 준비 + 게이지 + 결과 표시
export function minPlayMs(presses) { let t = 0; for (const s of presses) t += PREP_MS + s * 1000 + FB_MS; return t; }

const BAD = ["시발","씨발","병신","지랄","fuck","shit","bitch","개새","좆"];
export function validNick(n) {
  n = String(n == null ? "" : n).trim();
  if (n.length < 2 || n.length > 10) return "닉네임은 2~10자로 입력해 주세요.";
  if (!/^[0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ _\-]+$/.test(n)) return "한글·영문·숫자·공백·_ - 만 사용할 수 있어요.";
  const low = n.toLowerCase().replace(/\s+/g, "");
  for (const b of BAD) if (low.includes(b)) return "사용할 수 없는 표현이 포함되어 있어요.";
  return "";
}
export const CID_RE = /^u[0-9a-f]{20}$/;

export function isBetter(a, b) {
  if (a.day !== b.day) return a.day > b.day;
  if (a.score !== b.score) return a.score > b.score;
  return a.perfect > b.perfect;
}

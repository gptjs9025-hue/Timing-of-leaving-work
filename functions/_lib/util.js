export function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

const enc = new TextEncoder();
function b64u(buf) {
  let s = ""; const b = new Uint8Array(buf);
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64u(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "=";
  const bin = atob(s), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function key(secret) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
// 판 시작 토큰: 서버가 시작 시각·날짜·기기ID를 서명해 발급합니다.
export async function signToken(secret, data) {
  const p = b64u(enc.encode(JSON.stringify(data)));
  const sig = await crypto.subtle.sign("HMAC", await key(secret), enc.encode(p));
  return p + "." + b64u(sig);
}
export async function verifyToken(secret, token) {
  if (typeof token !== "string" || token.length > 400) return null;
  const [p, s] = token.split(".");
  if (!p || !s) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await key(secret), unb64u(s), enc.encode(p));
    if (!ok) return null;
    return JSON.parse(new TextDecoder().decode(unb64u(p)));
  } catch (e) { return null; }
}

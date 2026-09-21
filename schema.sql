-- 퇴근 타이밍 랭킹 테이블
-- scope: 일간 랭킹은 'YYYY-MM-DD'(한국시간), 역대 랭킹은 'ALL'
CREATE TABLE IF NOT EXISTS best (
  scope   TEXT    NOT NULL,
  cid     TEXT    NOT NULL,
  nick    TEXT    NOT NULL,
  day     INTEGER NOT NULL,
  score   INTEGER NOT NULL,
  perfect INTEGER NOT NULL,
  great   INTEGER NOT NULL,
  good    INTEGER NOT NULL,
  grades  TEXT    NOT NULL,
  ts      INTEGER NOT NULL,
  PRIMARY KEY (scope, cid)
);
CREATE INDEX IF NOT EXISTS idx_best_rank ON best (scope, day DESC, score DESC, perfect DESC, ts ASC);

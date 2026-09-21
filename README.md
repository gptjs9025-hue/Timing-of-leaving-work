# 퇴근 타이밍 — 온라인 배포 안내서

크롬 등 웹브라우저 주소로 누구나 접속하는 사이트로 올리는 방법입니다.
**Cloudflare 무료 계정 하나**로 사이트(Pages)와 랭킹 저장소(D1)를 함께 운영합니다.

> Cloudflare 화면의 메뉴 이름은 가끔 바뀝니다. 아래 이름과 조금 달라도 비슷한 항목을 찾아 주세요.
> 무료 사용 한도와 정책은 Cloudflare 가격 안내 페이지에서 직접 확인해 주세요.

## 폴더 구성

| 경로 | 역할 |
|---|---|
| `public/index.html` | 게임 화면 전체(메인·게임·랭킹·안내) |
| `functions/api/start.js` | 판 시작 시 서버 기준 날짜와 시작 토큰 발급 |
| `functions/api/submit.js` | 기록 제출 → 서버가 판정을 다시 계산해 검증 후 저장 |
| `functions/api/rank.js` | 일간/역대 랭킹 조회 |
| `functions/_lib/` | 서버 공용 규칙(판정·점수·패턴) |
| `schema.sql` | 랭킹 표 만들기(한 번만 실행) |
| `wrangler.toml.example` | 명령어(CLI) 방식으로 배포할 때만 사용 |

---

## 방법 A. GitHub 연결 (명령어 없이 웹 화면만으로)

### 1) GitHub에 올리기
1. github.com 로그인 → **New repository**로 새 저장소를 만듭니다(예: `toegeun-timing`).
2. **Add file → Upload files**에서 이 폴더 안의 파일과 폴더(`public`, `functions`, `schema.sql`, `package.json` 등)를 그대로 끌어다 놓고 **Commit**합니다. 폴더 구조가 유지되어야 합니다.
3. `wrangler.toml.example`을 `wrangler.toml`로 이름을 바꿔 올리지는 마세요(이 방법에서는 필요 없습니다).

### 2) Cloudflare에서 사이트 만들기
1. dash.cloudflare.com 에서 무료 가입 후 **Workers & Pages → Create → Pages → Connect to Git**을 선택합니다.
2. 방금 만든 저장소를 고릅니다.
3. 빌드 설정: Framework는 **None**, Build command는 **비워 두기**, Build output directory는 **`public`**.
4. **Save and Deploy**. 배포가 끝나면 `https://프로젝트이름.pages.dev` 주소가 생깁니다. (아직 랭킹은 동작하지 않습니다.)

### 3) 랭킹 저장소(D1) 만들기
1. 왼쪽 메뉴 **Storage & Databases → D1 SQL Database → Create**로 이름을 `toegeun-ranking`으로 만듭니다.
2. 만든 DB의 **Console** 탭에 `schema.sql` 내용을 통째로 붙여넣고 실행합니다.

### 4) 사이트와 저장소 연결
1. **Workers & Pages → (내 프로젝트) → Settings → Bindings → Add → D1 database**
2. Variable name은 반드시 **`DB`**, 데이터베이스는 `toegeun-ranking`을 선택합니다.
3. **Settings → Variables and Secrets → Add**에서 이름 **`SESSION_SECRET`**, 값은 아무도 모르는 긴 임의 문자열(32자 이상)로 넣고 **Encrypt**를 선택해 저장합니다.
4. **Deployments** 탭에서 가장 최근 배포를 다시 배포(Retry/Redeploy)합니다. 설정은 다시 배포해야 적용됩니다.

### 5) 확인
`https://프로젝트이름.pages.dev`에 접속해 게임을 한 판 하고 닉네임으로 랭킹 등록이 되는지 확인하세요.

---

## 방법 B. 명령어(CLI)로 배포 (Node.js가 있는 PC)

```bash
npm install
npx wrangler login
npx wrangler d1 create toegeun-ranking          # 출력된 database_id를 복사
cp wrangler.toml.example wrangler.toml           # database_id 칸에 붙여넣기
npm run db:remote                                # 랭킹 표 만들기
npx wrangler pages project create toegeun-timing --production-branch main
npx wrangler pages secret put SESSION_SECRET --project-name toegeun-timing
npm run deploy
```

내 PC에서 미리 실행해 보려면 `.dev.vars.example`을 `.dev.vars`로 복사해 값을 채우고 `npm run db:local`, `npm run dev`를 차례로 실행한 뒤 `http://localhost:8788`을 엽니다.
(로컬 실행 방식은 검증했지만, 위 원격 배포 명령은 실제 Cloudflare 계정에서는 아직 시험하지 못했습니다.)

---

## 서버가 하는 검증

- 게임은 각 DAY에서 SPACE를 누른 시각(초)을 서버로 보냅니다. **점수·DAY는 서버가 같은 날짜 패턴으로 판정을 다시 계산**하며, 클라이언트가 보낸 점수는 쓰지 않습니다.
- 판 시작 시 서버가 서명한 토큰을 받고, 제출 시 실제로 플레이하는 데 필요한 시간이 지났는지 확인합니다. 기기 ID와 토큰이 다르면 거부됩니다.
- 사람이 누르기 어려운 초단시간 입력(0.12초 미만)과 제한 시간을 넘긴 입력, 실패 판정이 섞인 기록은 거부됩니다.
- 로컬 테스트에서 확인한 것: 정상 기록 등록, 너무 빠른 제출 거부, 실패 판정 조작 거부, 위조 점수 무시, 토큰 변조·기기 ID 불일치 거부, 비속어 닉네임 거부, 브라우저 봇 플레이 → 등록 → 랭킹 표시.

## 알아둘 한계

- 같은 날짜에는 모두 같은 패턴이라, 패턴 공식을 아는 사람이 프로그램으로 정답 타이밍을 계산해 제출하는 것까지는 막지 못합니다. 서버는 실제 플레이 시간과 입력 범위만 확인합니다. 순위 경쟁이 커지면 Cloudflare Turnstile(봇 확인) 추가를 권장합니다.
- 닉네임은 중복을 허용하고, 비속어 목록(`functions/_lib/game.js`의 `BAD`)은 기본 몇 단어뿐입니다. 부적절한 닉네임은 Cloudflare D1 Console에서 `DELETE FROM best WHERE nick='...'`로 삭제할 수 있습니다.
- 랭킹에는 닉네임·기록·기기 임의 ID만 저장하며 이름·이메일 같은 개인정보는 수집하지 않습니다. 공개 운영 시 개인정보 안내 문구는 운영 정책에 맞게 추가하세요.
- 기획서 5장의 난이도 수치는 초안입니다. 조정하려면 `public/index.html`과 `functions/_lib/game.js`의 `SPEED`·`widthFor`·`limitFor`를 **같은 값으로 함께** 바꿔야 합니다. 한쪽만 바꾸면 검증에 실패합니다.

## 자주 묻는 문제

| 증상 | 확인할 것 |
|---|---|
| 랭킹이 "불러오지 못했습니다" | D1 바인딩 이름이 `DB`인지, `schema.sql`을 실행했는지, 바인딩 추가 후 다시 배포했는지 |
| 등록 시 "랭킹 서버에 연결되지 않아…" | `SESSION_SECRET` 설정 후 다시 배포했는지 |
| 기록이 "검증에 실패" | `index.html`과 `game.js`의 난이도 값이 서로 다른지 |

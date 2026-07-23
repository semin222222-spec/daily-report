# 삐딱 데일리 리포트

주식회사 삐딱 매장정산 웹앱 — 삐딱(본점) · 우삼집 · 쑥고개 세 매장의 매출과 손익을 한 곳에서 관리한다.

- **스택**: Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase (Auth + Postgres + RLS)
- **배포**: Vercel — `daily-report-ema5.vercel.app`
- **디자인 원본**: `../ppidak-report.html` (색상·레이아웃·용어의 기준)

---

## 1. 처음 세팅 (순서대로)

### 1-1. 의존성 설치

```bash
npm install
```

### 1-2. 환경변수

`.env.example`을 복사해서 `.env.local`을 만들고 채운다.

```bash
cp .env.example .env.local
```

| 변수                             | 어디서 얻나                                            | 필수 |
| -------------------------------- | ------------------------------------------------------ | ---- |
| `NEXT_PUBLIC_SUPABASE_URL`       | Supabase → Settings → API → Project URL                | ✅   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | 같은 화면 → `anon` `public`                            | ✅   |
| `SUPABASE_SERVICE_ROLE_KEY`      | 같은 화면 → `service_role` (**절대 공개 금지**)         | 선택 — 아래 참고 |
| `REVIEW_INGEST_SECRET`           | 아무 랜덤 문자열 (`openssl rand -hex 24`)              | 리뷰 수집 API 쓸 때만 |
| `NEXT_PUBLIC_LOGIN_EMAIL_DOMAIN` | 기본값 `bbiddak.com` 그대로 두면 된다                  | ✅   |

> **`SUPABASE_SERVICE_ROLE_KEY`가 없어도 앱은 완전히 동작한다.**
> 이 키는 RLS를 통째로 무시하는 마스터 키라서, 꼭 필요한 두 가지에만 쓴다:
> ① 설정 화면의 "점장 계정 발급" 버튼, ② `POST /api/reviews` 리뷰 수집.
> 둘 다 나중에 필요해지면 그때 채워도 된다.
> 위치: Supabase Dashboard → Settings → API → `service_role` → **Reveal** → 복사.

### 1-3. DB 스키마 만들기

Supabase Dashboard → **SQL Editor** 에서 아래 파일들을 **순서대로** 붙여넣고 실행한다.

1. `supabase/migrations/001_schema.sql` — 테이블·인덱스·트리거
2. `supabase/migrations/002_rls.sql` — RLS 정책

> 구버전 테이블(`daily_reports`, `user_profiles`)은 건드리지 않는다.
> 새 앱은 쓰지 않으므로, 데이터를 확인한 뒤 원할 때 수동으로 `drop table` 하면 된다.

### 1-4. 시드 데이터 넣기

**방법 A — SQL만으로 (service_role 키 불필요, 권장)**

1. SQL Editor에서 `supabase/migrations/003_seed.sql` 의 **PART A** 를 실행
   → 매장 3개 · 고정비 · 목표 · 직원 · 할일 · 리뷰 · 최근 35일 마감이 들어간다
2. Dashboard → **Authentication → Users → Add user** 에서 계정 4개를 만든다
   (**Auto Confirm User 체크**)

   | 이메일                  | 비밀번호      |
   | ----------------------- | ------------- |
   | `admin@bbiddak.com`   | `bbiddak1234` |
   | `bbiddak@bbiddak.com` | `bbiddak1234` |
   | `woosam@bbiddak.com`  | `bbiddak1234` |
   | `ssuk@bbiddak.com`    | `bbiddak1234` |

3. `003_seed.sql` 의 **PART B** 를 실행 → 각 계정에 역할·매장이 붙는다

**방법 B — 스크립트로 (service_role 키 필요)**

```bash
npm run seed
```

계정 생성까지 자동으로 한다. 둘 중 하나만 하면 되고, 여러 번 실행해도 안전하다.

로그인은 **아이디만** 입력한다 (`admin`, `bbiddak`, `woosam`, `ssuk`).
`@bbiddak.com` 은 앱이 내부적으로 붙인다.

| 아이디    | 이름        | 권한          |
| --------- | ----------- | ------------- |
| `admin`   | 세민 (오너) | 3개 매장 전부 |
| `bbiddak` | 삐딱 점장   | 삐딱만        |
| `woosam`  | 우삼집 점장 | 우삼집만      |
| `ssuk`    | 쑥고개 점장 | 쑥고개만      |

### 1-5. 로컬 실행

```bash
npm run dev
```

http://localhost:3000 → 로그인 화면. 아이디만 입력하면 된다(이메일 아님).

---

## 2. 권한 구조

| 역할      | 접근 범위                                                          |
| --------- | ------------------------------------------------------------------ |
| `owner`   | 3개 매장 전부 · 상단 매장 스위처 · 매장 비교 · 매장/계정 관리 · 고정비·목표 수정 |
| `manager` | 본인 매장 1곳만. 고정비·목표는 **읽기 전용** (전체 손익에 영향을 주기 때문) |

강제는 UI가 아니라 **Postgres RLS**가 한다. `profiles.role` / `profiles.store_id` 를 기준으로
`is_owner()` · `my_store_id()` 헬퍼 함수가 모든 테이블의 정책에서 쓰인다.
따라서 프론트에 버그가 있어도 다른 매장 데이터는 쿼리 자체가 비어서 돌아온다.

### 아이디 로그인

점장들이 이메일을 외우지 않아도 되도록, 입력한 아이디를
`<아이디>@bbiddak.com` 형태의 합성 이메일로 바꿔 Supabase Auth에 인증한다.
계정 발급도 같은 규칙을 따른다.

---

## 3. 손익 계산 공식

모든 화면이 `lib/pnl.ts` **한 곳**의 함수만 쓴다. 화면마다 따로 계산하지 않는다.

```
총매출     = 카드 + 현금 + 배달 + 기타
매출총이익 = 총매출 − 식자재 원가
영업이익   = 매출총이익 − 인건비 − 고정비 − 당일 지출
```

- **일 단위**: 인건비·고정비를 `store_settings.business_days`(기본 30일)로 나눈 일할 금액
- **월 단위**: 인건비·고정비는 월 전액
- **월 인건비** = Σ(월급직 월급) + Σ(시급직 시급 × 월 근무시간)
- **객단가** = 총매출 ÷ 객수
- **BEP 일매출** = (일 인건비 + 일 고정비) ÷ (1 − 목표원가율)

> 시안의 일일 손익표에는 없던 **`(-) 당일 지출`** 행을 추가했다.
> 일마감에서 소모품 지출을 입력받는데 이걸 빼면 영업이익이 실제보다 높게 잡히기 때문이다.

---

## 4. 화면

| 경로         | 메뉴          | 하는 일                                                        |
| ------------ | ------------- | -------------------------------------------------------------- |
| `/login`     | —             | 아이디/비번 로그인. 매장 로고·칩 표시                           |
| `/dashboard` | 대시보드      | KPI 4종 · 7일 매출 추이 · 월 목표 게이지 · (오너)매장 비교      |
| `/closing`   | 일마감 입력   | 날짜별 마감 upsert · 이번 주 마감 현황(미입력 표시)            |
| `/daily`     | 일일 보고서   | 일 손익계산서 · 객단가 · BEP 대비. 날짜 이동                    |
| `/monthly`   | 월정산        | 월 누적 손익 · 급여 정산표 · CSV 내보내기. 월 이동              |
| `/labor`     | 인건비        | 직원 등록/수정/퇴사 처리                                        |
| `/todos`     | 오늘 할일     | 담당(홀·주방·점장) 태그가 있는 to-do                            |
| `/reviews`   | 리뷰 모아보기 | 새 리뷰 수·평균 별점 · 리뷰 리스트 · 수동 입력                   |
| `/settings`  | 설정          | 고정비 · 목표/기준 · (오너)매장 추가 · 점장 계정 발급           |

모바일 우선. 880px 이하에서 사이드바가 오프캔버스로 전환된다.

---

## 5. 로고 넣기

`public/logos/` 에 매장 `tag` 와 같은 이름의 PNG를 넣으면 끝이다. 코드 수정 불필요.

```
public/logos/bbiddak.png   ✅ 있음
public/logos/woosam.png   ✅ 있음
public/logos/ssuk.png     ⬜ 없음 → 타이포 배지로 자동 폴백
```

파일이 없으면 시안과 동일한 한 글자 배지(삐/우/쑥)로 폴백한다.
어두운 배경(로그인·사이드바) 위에서는 흰색 라운드 플레이트에 얹어 표시하므로
배경이 투명하지 않은 PNG도 깔끔하게 나온다.

---

## 6. 리뷰 수집 (확장 지점)

네이버·카카오는 새 리뷰를 외부로 푸시하는 **공식 API가 없다.** 그래서 이번 버전은:

1. 실시간 알림 → 네이버 스마트플레이스 / 카카오 사장님 앱의 기본 알림을 그대로 쓴다
2. 우리 앱 → `/reviews` 화면에서 **모아 보기**에 집중
3. 입력 경로 → (a) 화면에서 수동 입력, (b) `POST /api/reviews` 엔드포인트

자동 크롤링은 이번 스코프에 없다. 나중에 붙일 때 크롤러가 이 엔드포인트로 쏘기만 하면
앱 코드는 손댈 필요가 없다.

```bash
curl -X POST https://daily-report-ema5.vercel.app/api/reviews \
  -H 'content-type: application/json' \
  -H "x-ingest-secret: $REVIEW_INGEST_SECRET" \
  -d '{
    "reviews": [{
      "store_tag": "bbiddak",
      "source": "naver",
      "author": "김**",
      "rating": 5,
      "text": "맛있어요",
      "posted_at": "2026-07-23T10:00:00Z",
      "external_id": "naver-12345"
    }]
  }'
```

`external_id` 를 채워 보내면 `(store_id, source, external_id)` 유니크 제약이
중복 수집을 막아준다. 같은 리뷰를 여러 번 보내도 안전하다.

---

## 7. Vercel 배포 (기존 프로젝트 유지)

도메인 `daily-report-ema5.vercel.app` 과 Vercel 프로젝트는 **그대로 쓴다.** 코드만 교체된다.

### 7-1. 환경변수 등록

Vercel → 해당 프로젝트 → **Settings → Environment Variables** 에서
Production / Preview / Development 모두에 등록한다.

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY        ← Sensitive 로 표시
REVIEW_INGEST_SECRET             ← Sensitive 로 표시
NEXT_PUBLIC_LOGIN_EMAIL_DOMAIN
```

### 7-2. Root Directory 확인

이 저장소는 리포 루트가 아니라 `daily-report-system/` 하위에 앱이 있다.
Vercel → Settings → **General → Root Directory** 를 `daily-report-system` 으로 맞춘다.
(이미 그렇게 돼 있으면 그대로 두면 된다.)

### 7-3. 배포

```bash
git add -A
git commit -m "feat: 삐딱 데일리 리포트 v2 — 전면 재작성"
git push
```

Vercel이 push를 감지해 자동 빌드·배포한다. CLI로 직접 하려면:

```bash
npx vercel --prod
```

### 7-4. 배포 후 체크리스트

- [ ] Supabase에 `001_schema.sql`, `002_rls.sql` 실행했는가
- [ ] `npm run seed` 로 매장·계정이 들어갔는가 (또는 설정 화면에서 직접 발급)
- [ ] `admin` 으로 로그인 → 상단 매장 스위처가 3개 나오는가
- [ ] 점장 계정으로 로그인 → 본인 매장만 보이고 스위처가 없는가
- [ ] 일마감 저장 → 대시보드·일일 보고서 숫자가 바뀌는가

---

## 8. 프로젝트 구조

```
app/
  (app)/            앱 셸이 적용되는 라우트 그룹 (사이드바+상단바)
    layout.tsx      세션·매장 조회 → AppShell
    actions.ts      매장 전환 / 로그아웃
    dashboard|closing|daily|monthly|labor|todos|reviews|settings/
  api/
    reviews/        POST — 외부 크롤러 수집 (확장 지점)
    export/monthly/ GET  — 월정산 CSV
  login/            로그인 (앱 셸 없음)
components/
  shell/AppShell.tsx    사이드바·상단바·매장 스위처
  charts/SalesTrend.tsx 7일 추이 SVG (클라이언트 JS 0바이트)
  ui/                   KPI 타일 · 액션 폼 래퍼
  BrandMark.tsx         로고 슬롯 + 폴백
lib/
  pnl.ts            🔑 손익 계산 단일 소스
  session.ts        세션·활성 매장·권한 헬퍼
  queries.ts        Supabase 조회 모음
  supabase/         client · server · middleware
  format.ts nav.ts types.ts
supabase/migrations/  001_schema.sql · 002_rls.sql
scripts/seed.ts       시드
middleware.ts         세션 갱신 + 미인증 리다이렉트
```

### 디자인 토큰

시안의 CSS 변수는 `tailwind.config.ts` 로 옮겼고, 인라인 그라디언트·SVG에서 쓰려고
`app/globals.css` 의 `:root` 에도 같은 값을 남겨뒀다. **두 곳의 값은 항상 일치해야 한다.**

| 토큰            | 값        |
| --------------- | --------- |
| `brand`         | `#f0542d` |
| `brand-deep`    | `#c33c17` |
| `brand-ink`     | `#191512` |
| `store-bbiddak`  | `#f0542d` |
| `store-woosam`  | `#d98324` |
| `store-ssuk`    | `#4b7f52` |

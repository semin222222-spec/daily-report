# 🍺 매장 마감 보고 시스템

5개 매장(술집1~4, 고기집1)의 점장님들이 매일 마감 보고를 입력하고, 사장님이 월간 매출 캘린더와 전월 대비 매출 비교, 긴급 이슈 알림을 한눈에 확인할 수 있는 웹 애플리케이션입니다.

## ✨ 핵심 기능

### 점장님 (Manager)
- **본인 매장 자동 고정** — 로그인하면 담당 매장이 자동으로 세팅
- **24개 항목 마감 보고** — 매출 / 재고 / 위생 / 인원 / 고객 통계
- **실시간 매출 검증** — 카드+현금+기타-할인이 총매출과 맞지 않으면 경고
- **천단위 자동 쉼표** — `1850000` 입력하면 `1,850,000` 자동 표시
- **주요 이슈 선택** — 컴플레인/기기 고장/재료 품절/시설 수리 (중복 가능)
- **다시 수정 가능** — 오늘 이미 저장한 보고서는 불러와서 수정

### 사장님 (Owner)
- **오늘의 긴급 알림** — 이슈가 보고된 매장만 빨갛게 표시 (펄싱 애니메이션)
- **방금 제출된 보고서** — 점장이 저장한 순서대로 최근 5건 리스트
- **월간 히트맵 캘린더** — 일별 매출이 진한 색일수록 대박 (호버 시 툴팁)
- **날짜 클릭 → 상세 모달** — 그날의 전 매장 보고서를 탭으로 전환하며 확인
- **전월 대비 비교** — 매장별 막대 차트 + 증감 테이블
- **매장별 필터** — 전체/술집1~4/고기집1 토글

## 🛠 기술 스택

- **Next.js 14** (App Router)
- **Supabase** (PostgreSQL + Auth + Row Level Security)
- **TypeScript**
- **Recharts** (차트)
- **Inline Style + CSS Variables** (Tailwind 미사용, 환경 독립적인 디자인)

## 🎨 디자인 철학

마감 시간(새벽)에 폰으로 작성하는 점장님들을 고려해 **다크 테마 + 호박색(#c9a961) 포인트**로 만들었습니다. 에디토리얼 느낌의 EB Garamond 세리프 폰트와 JetBrains Mono 모노스페이스를 조합해 **"심야의 장부"** 같은 분위기를 연출했어요.

## 📁 프로젝트 구조

```
daily-report-system/
├── app/
│   ├── layout.tsx              # AuthProvider + NavBar
│   ├── page.tsx                # 홈 (역할별 자동 리다이렉트)
│   ├── globals.css             # 폰트 로드 + 기본 리셋
│   ├── login/page.tsx          # 로그인
│   ├── report/page.tsx         # 점장 전용 (RequireRole)
│   └── dashboard/page.tsx      # 사장 전용 (RequireRole)
├── components/
│   ├── NavBar.tsx              # 역할별 메뉴
│   ├── RequireRole.tsx         # 역할 기반 접근 제어
│   ├── ReportForm.tsx          # 마감 보고 폼 (5개 섹션)
│   ├── UrgentAlerts.tsx        # 오늘의 긴급 알림
│   ├── RecentReports.tsx       # 최근 제출 보고서 리스트
│   ├── MonthlyCalendar.tsx     # 히트맵 캘린더
│   ├── ReportDetailModal.tsx   # 날짜별 상세 모달
│   └── MonthCompareChart.tsx   # 전월 비교 차트 + 테이블
├── lib/
│   ├── theme.ts                # 색상 팔레트 + 포맷 유틸
│   ├── supabase.ts             # DB 클라이언트 + 쿼리 함수
│   └── auth.tsx                # AuthProvider + useAuth
├── supabase/
│   ├── 001_schema.sql          # daily_reports 테이블
│   └── 002_auth_and_rls.sql    # user_profiles + RLS 정책
├── package.json
├── tsconfig.json
├── next.config.js
├── .env.local.example
└── README.md
```

## 🚀 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경변수 설정
```bash
cp .env.local.example .env.local
```

`.env.local` 파일을 열어 Supabase 프로젝트의 URL과 anon key를 입력:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### 3. Supabase DB 세팅

Supabase 대시보드 → **SQL Editor** 에서 **순서대로** 실행:

1. `supabase/001_schema.sql` — 테이블 생성
2. `supabase/002_auth_and_rls.sql` — Auth 연동 + RLS

### 4. 계정 생성 (한 번만)

Supabase 대시보드 → **Authentication → Users → Add user** 에서 이메일/비밀번호로 6개 계정 생성:
- 사장님 1명
- 점장 5명 (술집1, 2, 3, 4, 고기집1 담당)

### 5. 프로필 연결

각 계정의 User UID를 복사해서 SQL Editor에서 실행:
```sql
insert into user_profiles (user_id, role, store_name, display_name) values
  ('사장님-UID-여기', 'owner', null, '사장님'),
  ('점장1-UID-여기', 'manager', '술집1', '김점장'),
  ('점장2-UID-여기', 'manager', '술집2', '이점장'),
  ('점장3-UID-여기', 'manager', '술집3', '박점장'),
  ('점장4-UID-여기', 'manager', '술집4', '최점장'),
  ('점장5-UID-여기', 'manager', '고기집1', '정점장');
```

### 6. 개발 서버 실행
```bash
npm run dev
```

http://localhost:3000 접속

## 🔐 보안 설계

### Row Level Security (DB 레벨 강제)
- **점장**: 본인 매장 데이터만 `SELECT` / `INSERT` / `UPDATE`
- **사장**: 전 매장 `SELECT` 가능
- 프론트엔드를 조작해도 DB가 거부하므로 보안 유지

### `security definer` 헬퍼 함수
`current_user_role()`, `current_user_store()`는 `security definer`로 선언되어 RLS 무한 재귀 방지.

### 데이터 무결성
```sql
constraint manager_has_store check (
  (role = 'manager' and store_name is not null) or
  (role = 'owner' and store_name is null)
)
```
이상한 상태 원천 차단.

## ✅ 동작 확인 체크리스트

- [ ] 술집1 점장 로그인 → `/report` 자동 이동, 매장명이 "술집1"로 배지 표시
- [ ] 매출 1850000 입력 → `1,850,000원`으로 자동 포맷
- [ ] 카드+현금+기타-할인이 총매출과 다르면 주황색 경고
- [ ] 이슈 버튼 클릭 → 빨간색으로 전환 + 흰 체크
- [ ] 저장 → 녹색 토스트 + "사장님 대시보드에 반영되었습니다"
- [ ] 술집2 점장으로 로그인 → 술집1이 저장한 보고서는 **안 보여야 함** (RLS)
- [ ] 사장 로그인 → `/dashboard` 이동, 긴급 알림에 술집1이 빨갛게 (이슈 보고 시)
- [ ] 캘린더에서 4월 22일 클릭 → 상세 모달 (매장 탭 전환)

## 💡 확장 아이디어

- **PWA 전환**: 점장님이 홈화면에 추가해 앱처럼 사용
- **카카오톡/슬랙 알림**: 이슈 발생 시 Supabase Edge Function + Webhook
- **엑셀 내보내기**: 세무사 전달용 월별 xlsx (SheetJS)
- **주별/요일별 패턴 분석**: `monthly_sales_summary` 뷰 확장
- **비밀번호 변경 페이지**: Supabase `auth.updateUser()` API
- **이슈 히스토리**: 매장별로 지난 1개월간 어떤 이슈가 있었는지 타임라인

## 📝 라이선스

Private — 내부 운영용

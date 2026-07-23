-- ============================================================
-- 004_accounts.sql — 오너 계정 연결
--
-- 003_seed.sql 실행 후에 돌린다. (003과 반드시 따로 실행할 것)
--
-- 이 파일이 하는 일은 딱 하나:
--   Supabase Auth에 만들어 둔 admin 계정에 "오너" 권한을 붙인다.
--
-- 점장 계정은 여기서 만들 필요 없다.
-- admin 으로 로그인한 뒤 [설정] → [점장 계정 관리] 에서 발급·삭제하면 된다.
-- (그 기능을 쓰려면 .env.local 의 SUPABASE_SERVICE_ROLE_KEY 가 필요하다)
-- ============================================================


-- ── 사전 준비 ────────────────────────────────────────────────
-- Dashboard → Authentication → Users → "Add user" 로 아래 계정을 만든다.
--
--   이메일   : admin@bbiddak.com
--   비밀번호 : bbiddak1234   (원하는 걸로 바꿔도 된다)
--
-- ⚠️ 도메인은 반드시 .com — Supabase가 .local 같은 가짜 TLD를 거부한다.
-- ⚠️ "Auto Confirm User" 체크 — 안 하면 로그인이 막힌다.
--    (놓쳤어도 아래 ① 이 자동으로 풀어준다)


-- ① 미확인 계정 확인 처리 (Auto Confirm 체크를 놓쳤을 때의 안전장치)
update auth.users
   set email_confirmed_at = coalesce(email_confirmed_at, now())
 where email like '%@bbiddak.com'
   and email_confirmed_at is null;


-- ② 진단용 임시 계정 정리 (없으면 아무 일도 안 일어난다)
delete from auth.users where email = 'zz-domaincheck@bbiddak.com';


-- ③ admin 에게 오너 권한 부여
--    (계정을 아직 안 만들었으면 0행 — 에러는 안 난다)
insert into profiles (id, login_id, name, role, store_id)
select u.id, 'admin', '세민 (오너)', 'owner', null
from auth.users u
where u.email = 'admin@bbiddak.com'
on conflict (id) do update
  set login_id = excluded.login_id,
      name     = excluded.name,
      role     = excluded.role,
      store_id = excluded.store_id;


-- ── 확인 ─────────────────────────────────────────────────────
-- 아래가 1행(admin / owner) 나오면 성공. 이제 로그인하면 된다.
select p.login_id as 아이디, p.name as 이름, p.role as 권한,
       coalesce(s.name, '전체') as 매장
from profiles p
left join stores s on s.id = p.store_id
order by p.role, p.login_id;


-- ════════════════════════════════════════════════════════════
-- (선택) 점장 계정을 대시보드에서 직접 만들었다면 아래로 연결한다.
-- 앱의 [설정] 화면에서 발급하면 이 SQL은 필요 없다.
-- ════════════════════════════════════════════════════════════
--
-- insert into profiles (id, login_id, name, role, store_id)
-- select u.id, m.login_id, m.name, 'manager',
--        (select s.id from stores s where s.tag = m.store_tag)
-- from (values
--   ('bbiddak', '삐딱 점장',   'bbiddak'),
--   ('woosam',  '우삼집 점장', 'woosam'),
--   ('ssuk',    '쑥고개 점장', 'ssuk')
-- ) as m(login_id, name, store_tag)
-- join auth.users u on u.email = m.login_id || '@bbiddak.com'
-- on conflict (id) do update
--   set login_id = excluded.login_id,
--       name     = excluded.name,
--       role     = excluded.role,
--       store_id = excluded.store_id;

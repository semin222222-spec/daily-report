-- ============================================================
-- 012_login_hints.sql — 로그인 화면 계정 안내
--
-- 011 까지 실행한 뒤에 돌린다. 여러 번 실행해도 안전하다.
--
-- 문제:
--   로그인 화면의 "계정 안내" 목록을 매장 태그로 추측해서 만들고 있었다.
--   지점을 추가하면 bbiddak-2, bbiddak-3 처럼 실제로 없는 아이디가 떴다.
--
-- 해결:
--   실제 profiles 를 읽어서 보여준다. 다만 profiles 는 로그인해야 읽히므로
--   (RLS), 로그인 전에 쓸 수 있게 함수로 꺼낸다.
--
--   security definer 라 RLS를 통과하지만, 반환하는 건 아이디·이름·매장뿐이다.
--   비밀번호나 이메일 같은 건 나가지 않는다.
-- ============================================================

create or replace function login_hints()
returns table (
  login_id   text,
  name       text,
  role       text,
  store_name text
)
language sql security definer stable
set search_path = public as $$
  select
    p.login_id,
    p.name,
    p.role,
    coalesce(s.name, '')
  from profiles p
  left join stores s on s.id = p.store_id
  -- 비활성 매장 담당자는 어차피 못 들어오므로 숨긴다
  where p.role = 'owner' or s.is_active is true
  order by
    case when p.role = 'owner' then 0 else 1 end,
    p.login_id;
$$;

grant execute on function login_hints() to anon, authenticated;


-- ── 끄고 싶다면 ──────────────────────────────────────────────
-- 로그인 화면에 아이디 목록을 아예 노출하고 싶지 않으면 아래를 실행한다.
-- 그러면 안내 목록이 사라지고 직접 입력만 남는다 (앱은 정상 동작).
--
--   revoke execute on function login_hints() from anon;


-- ── 확인 ─────────────────────────────────────────────────────
select * from login_hints();

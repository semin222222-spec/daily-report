-- ============================================
-- 004_attendance_delete.sql
-- 알바 "완전 삭제"(출퇴근 기록 포함) 기능
-- 003_attendance.sql 실행 후에 실행하세요
--
-- 설계 메모
--   - 003 에서는 알바를 soft delete(is_active=false)만 허용했다.
--   - 운영 중 "잘못 등록한 알바를 기록까지 깔끔히 지우고 싶다"는 요구가 생겨
--     관리자용 완전 삭제 RPC 를 추가한다.
--   - 기록(attendance_records)에는 여전히 일반 DELETE 정책을 열지 않는다.
--     (시간 분쟁 방지를 위한 append-only 원칙 유지)
--     대신 이 RPC(security definer) 안에서만, 알바 삭제와 함께 기록을 정리한다.
--   - 권한: owner 전체 / manager 자기 매장 알바만. 함수 내부에서 검사.
--   - attendance_records.staff_id 는 on delete restrict 라, 기록을 먼저 지운 뒤 알바를 지운다.
-- ============================================

create or replace function delete_staff_cascade(p_staff_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store text;
begin
  select store_name into v_store
  from attendance_staff
  where id = p_staff_id;

  if v_store is null then
    raise exception '존재하지 않는 알바입니다';
  end if;

  -- 권한 검사: owner 전체 / manager 는 자기 매장만
  if not (
    current_user_role() = 'owner'
    or (current_user_role() = 'manager' and v_store = current_user_store())
  ) then
    raise exception '권한이 없습니다';
  end if;

  -- 기록 먼저 삭제(FK on delete restrict 회피) → 알바 삭제
  delete from attendance_records where staff_id = p_staff_id;
  delete from attendance_staff   where id = p_staff_id;
end;
$$;

-- 로그인 사용자만 호출 가능 (권한은 함수 내부에서 추가 검사)
revoke all on function delete_staff_cascade(uuid) from public;
grant execute on function delete_staff_cascade(uuid) to authenticated;

-- ============================================
-- 적용 후 점검
--   select proname, prosecdef from pg_proc where proname = 'delete_staff_cascade';
-- ============================================

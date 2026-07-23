-- ============================================
-- 005_attendance_record_delete.sql
-- 잘못 등록된 출퇴근 기록 1건을 삭제하는 RPC
-- 003_attendance.sql / 004_attendance_delete.sql 실행 후에 실행하세요
--
-- 설계 메모
--   - 003 에서는 attendance_records 에 DELETE 정책을 두지 않아
--     일반 클라이언트는 기록을 삭제할 수 없게 했다(시간 분쟁 방지).
--   - 그러나 운영 중 "잘못 누른 출근/퇴근 한 건만 깔끔히 지우고 싶다" 는 요구가 생겨,
--     RPC 한 곳에서만 통제된 삭제를 허용한다.
--     (일반 DELETE 정책은 여전히 열지 않는다)
--   - 권한: owner 전체 / manager 자기 매장 기록만. 함수 내부에서 검사.
-- ============================================

create or replace function delete_attendance_record(p_record_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store text;
begin
  select store_name into v_store
  from attendance_records
  where id = p_record_id;

  if v_store is null then
    raise exception '존재하지 않는 기록입니다';
  end if;

  -- 권한 검사: owner 전체 / manager 는 자기 매장만
  if not (
    current_user_role() = 'owner'
    or (current_user_role() = 'manager' and v_store = current_user_store())
  ) then
    raise exception '권한이 없습니다';
  end if;

  delete from attendance_records where id = p_record_id;
end;
$$;

revoke all on function delete_attendance_record(uuid) from public;
grant execute on function delete_attendance_record(uuid) to authenticated;

-- ============================================
-- 적용 후 점검
--   select proname, prosecdef from pg_proc where proname = 'delete_attendance_record';
-- ============================================

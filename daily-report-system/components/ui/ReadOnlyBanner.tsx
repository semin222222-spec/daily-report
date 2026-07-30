/** 조회 전용 권한일 때 페이지 상단에 뜨는 안내 */
export function ReadOnlyBanner() {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-card border border-line bg-line-soft/60 px-4 py-2.5 text-[13px] text-ink-2">
      <span className="pill bg-line-soft text-muted">조회 전용</span>
      이 메뉴는 보기만 가능합니다. 저장·수정·삭제 권한이 없습니다.
    </div>
  )
}

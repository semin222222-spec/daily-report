/**
 * 메뉴를 누르는 즉시 뜨는 로딩 뼈대.
 *
 * 이게 없으면 서버가 데이터를 다 가져올 때까지 이전 화면이 그대로 멈춰 있어서
 * "렉 걸린 것"처럼 느껴진다. 이 파일이 있으면 클릭하자마자 뼈대가 나타나
 * "눌렸다"는 느낌을 즉시 준다.
 */
export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* KPI 타일 자리 */}
      <div className="grid grid-cols-2 gap-4 shell:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[92px] rounded-card border border-line bg-surface"
          />
        ))}
      </div>

      {/* 카드 두 개 자리 */}
      <div className="mt-4 h-[150px] rounded-card border border-line bg-surface" />
      <div className="mt-4 grid grid-cols-1 gap-4 shell:grid-cols-[1.5fr_1fr]">
        <div className="h-[230px] rounded-card border border-line bg-surface" />
        <div className="h-[230px] rounded-card border border-line bg-surface" />
      </div>
    </div>
  )
}

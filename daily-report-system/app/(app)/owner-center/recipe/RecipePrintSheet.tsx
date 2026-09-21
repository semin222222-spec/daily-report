import type { Recipe } from '@/lib/recipes'

/**
 * 레시피 1건의 인쇄용 마크업. 화면에는 보이지 않고(hidden) 인쇄 시에만(print:) 나타나는
 * 제목처럼, 이 컴포넌트 자체도 상세 페이지에서는 화면에 그대로 보이는 본문으로,
 * 목록 페이지의 다중 인쇄에서는 화면 밖에 떠 있다가 인쇄될 때만 쓰인다.
 */
export function RecipePrintSheet({
  recipe,
  photoUrl,
  categoryName,
  className = '',
}: {
  recipe: Recipe
  photoUrl?: string
  categoryName?: string
  className?: string
}) {
  return (
    <div className={className}>
      {categoryName && (
        <p className="mb-1 hidden text-[12px] font-semibold text-muted print:block">
          {categoryName}
        </p>
      )}
      <h2 className="mb-4 hidden text-[19px] font-extrabold print:mb-2 print:block print:text-[16px]">
        {recipe.name}
      </h2>

      {photoUrl && (
        <div className="card mb-4 !p-0 overflow-hidden bg-[#fbfaf8] print:mb-2 print:break-inside-avoid">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt={recipe.name}
            className="mx-auto max-h-64 w-auto max-w-full object-contain sm:max-h-80 print:max-h-[170px]"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 shell:grid-cols-2 print:grid-cols-2 print:gap-2">
        {/* 재료 */}
        <div className="card print:break-inside-avoid print:p-3">
          <h3 className="card-title print:text-[13px]">재료</h3>
          <p className="card-sub print:mb-1 print:text-[11px]">1인분 기준</p>
          <ul className="divide-y divide-line-soft">
            {recipe.ingredients.map((i, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between py-2 text-[13.5px] print:py-1 print:text-[12px]"
              >
                <span className="text-ink-2">{i.name}</span>
                {i.amount && <span className="font-semibold tabular-nums">{i.amount}</span>}
              </li>
            ))}
          </ul>

          {(recipe.garnish || recipe.sauce) && (
            <div className="mt-3 space-y-1 border-t border-line-soft pt-3 text-[13px] print:mt-1 print:pt-1 print:text-[11px]">
              {recipe.garnish && (
                <p>
                  <span className="font-semibold text-ink-2">가니쉬 · </span>
                  {recipe.garnish}
                </p>
              )}
              {recipe.sauce && (
                <p>
                  <span className="font-semibold text-ink-2">소스 · </span>
                  {recipe.sauce}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 제조 및 제공 방법 */}
        <div className="card print:break-inside-avoid print:p-3">
          <h3 className="card-title print:text-[13px]">제조 및 제공 방법</h3>
          <p className="card-sub print:mb-1 print:text-[11px]">순서대로 진행한다</p>
          <ol className="space-y-2.5 print:space-y-1">
            {recipe.steps.map((s, idx) => (
              <li
                key={idx}
                className="flex gap-2.5 text-[13.5px] leading-relaxed print:gap-1.5 print:text-[12px] print:leading-snug"
              >
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand/[.1] text-[11px] font-bold text-brand-deep print:h-4 print:w-4 print:text-[9px]">
                  {idx + 1}
                </span>
                <span className="text-ink-2">{s}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* 특이사항 */}
        {recipe.notes.length > 0 && (
          <div className="card border-warn/40 bg-warn/[.05] print:break-inside-avoid print:p-3">
            <h3 className="card-title print:text-[13px]">특이사항</h3>
            <ul className="space-y-1.5 print:space-y-1">
              {recipe.notes.map((n, idx) => (
                <li
                  key={idx}
                  className="flex gap-2 text-[13px] leading-relaxed text-ink-2 print:text-[11px] print:leading-snug"
                >
                  <span className="text-[#8a5a00]">⚠</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 원재료 전처리 */}
        {recipe.prep.length > 0 && (
          <div className="card print:break-inside-avoid print:p-3">
            <h3 className="card-title print:text-[13px]">원재료 전처리</h3>
            <ul className="space-y-2 print:space-y-1">
              {recipe.prep.map((p, idx) => (
                <li key={idx} className="text-[13px] leading-relaxed print:text-[11px]">
                  <span className="font-semibold text-ink-2">{p.name}</span>
                  <span className="text-muted"> · {p.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

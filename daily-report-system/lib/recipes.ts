/**
 * 점주센터 03. 레시피 — DB(recipe_categories, recipes) 타입.
 *
 * 실제 데이터는 023_recipes.sql 로 옮겨졌다. 이 파일은 타입과 표시용 헬퍼만 담는다.
 * 최초 시드 데이터는 scripts/recipe-seed-data.ts 에 남아있다(마이그레이션 재생성용).
 */

export interface RecipeIngredient {
  name: string
  amount: string
}

export interface RecipePrep {
  name: string
  detail: string
}

export interface RecipeCategory {
  id: string
  name: string
  sort_order: number
  created_at: string
}

export interface Recipe {
  id: string
  category_id: string
  name: string
  ingredients: RecipeIngredient[]
  garnish: string
  sauce: string
  steps: string[]
  notes: string[]
  prep: RecipePrep[]
  photo_path: string
  sort_order: number
  created_at: string
  updated_at: string
}

/** "재료명:수량" 줄 텍스트 <-> RecipeIngredient[] / RecipePrep[] */
export function parseNameValueLines(text: string): { name: string; value: string }[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(':')
      if (idx === -1) return { name: line, value: '' }
      return { name: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() }
    })
}

export function ingredientsToLines(items: RecipeIngredient[]): string {
  return items.map((i) => (i.amount ? `${i.name}:${i.amount}` : i.name)).join('\n')
}

export function prepToLines(items: RecipePrep[]): string {
  return items.map((p) => (p.detail ? `${p.name}:${p.detail}` : p.name)).join('\n')
}

/** 줄바꿈 텍스트 <-> string[] (steps, notes) */
export function linesToArray(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

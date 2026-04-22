// 색상 팔레트 (Light Theme - 깔끔한 장부)
export const C = {
  bg: '#faf7f2',         // 크림 배경 (종이 느낌)
  bgCard: '#ffffff',     // 흰 카드
  bgDeep: '#f0ebe3',     // 약간 진한 배경 (섹션 구분용)
  text: '#1a1612',       // 진한 검정
  textDim: '#6b6459',    // 중간 회색
  textFaint: '#a89e8e',  // 연한 회색
  border: '#e5ddc9',     // 부드러운 베이지 테두리
  borderLight: '#f0e8d6',
  accent: '#a07c2c',     // 호박색 (라이트 배경용)
  accentBright: '#c9a961',
  danger: '#dc2626',
  dangerBright: '#ef4444',
  dangerDeep: '#991b1b',
  success: '#5a7a3e',    // 녹색
  warning: '#b85c2c',    // 주황
};

// 공통 style 객체
export const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: C.bg,
    color: C.text,
    fontFamily: "'EB Garamond', Georgia, serif",
  },
  mono: {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  },
  card: {
    backgroundColor: C.bgCard,
    border: `1px solid ${C.border}`,
    borderRadius: '12px',
  },
  input: {
    width: '100%',
    backgroundColor: C.bgCard,
    border: `1px solid ${C.border}`,
    borderRadius: '6px',
    padding: '0.6rem 0.85rem',
    color: C.text,
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: '0.875rem',
    outline: 'none',
  },
  label: {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    color: C.textDim,
    display: 'block',
    marginBottom: '8px',
  },
};

// ============================================
// 포맷 유틸
// ============================================
export const formatKRW = (n: number) => new Intl.NumberFormat('ko-KR').format(n) + '원';

export const formatCompact = (n: number) => {
  if (n >= 10000000) return `${(n / 10000000).toFixed(1)}천만`;
  if (n >= 10000) return `${Math.round(n / 10000)}만`;
  return `${n}`;
};

// 입력 필드용: 1850000 → "1,850,000"
export const formatNumInput = (n: number | string | null | undefined) => {
  if (n === 0 || n === '' || n === null || n === undefined) return '';
  return new Intl.NumberFormat('ko-KR').format(Number(n));
};

// "1,850,000" → 1850000
export const parseNumInput = (str: string) => {
  const cleaned = String(str).replace(/[^0-9]/g, '');
  return cleaned === '' ? 0 : Number(cleaned);
};
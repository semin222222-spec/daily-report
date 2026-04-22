// 색상 팔레트 (프로토타입과 동일)
export const C = {
  bg: '#0a0908',
  bgCard: '#14110f',
  bgDeep: '#080706',
  text: '#f2e9dc',
  textDim: '#8a8378',
  textFaint: '#5a544a',
  border: '#2a2520',
  borderLight: '#3a342e',
  accent: '#c9a961',
  accentBright: '#d9b971',
  danger: '#dc2626',
  dangerBright: '#ef4444',
  dangerDeep: '#991b1b',
  success: '#6b8e4e',
  warning: '#c9734e',
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

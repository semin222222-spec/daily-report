/**
 * 매장 로고 슬롯.
 *
 * /public/logos/{tag}.png 가 있으면 그 이미지를, 없으면 시안과 동일한
 * 타이포 로고로 폴백한다. 파일 유무는 서버(lib/logos.ts)에서 미리 확정하므로
 * 깨진 이미지가 잠깐이라도 보이는 일이 없다.
 *
 * 나중에 로고 파일만 폴더에 넣으면 코드 수정 없이 바로 반영된다.
 */

interface StoreLogoProps {
  tag: string
  name: string
  color: string
  badge: string
  /** 로고 그림의 한 변 크기(px) */
  size?: number
  /** 어두운 배경 위에 올릴 때 — 흰 플레이트를 깔아 배경 있는 PNG도 깔끔하게 보이게 한다 */
  onDark?: boolean
  /** 서버에서 확인한 로고 경로. null이면 타이포 배지로 폴백 */
  src?: string | null
}

export function StoreLogo({
  tag,
  name,
  color,
  badge,
  size = 26,
  onDark = false,
  src,
}: StoreLogoProps) {
  if (!src) {
    // 폴백: 매장 컬러 배지 (시안의 .store-chip .badge)
    return (
      <span
        className="grid shrink-0 place-items-center rounded-lg font-extrabold text-white"
        style={{
          background: color,
          width: size,
          height: size,
          fontSize: Math.round(size * 0.5),
        }}
        aria-label={name}
      >
        {badge}
      </span>
    )
  }

  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-lg ${
        onDark ? 'bg-white' : ''
      }`}
      style={{ width: size, height: size }}
    >
      {/* next/image 대신 <img> — 로고는 사용자가 아무 크기로나 넣을 수 있어서
          사전 최적화보다 object-contain 이 안전하다 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="h-full w-full object-contain"
      />
    </span>
  )
}

/**
 * 로그인 화면용 브랜드 락업 — 심볼(구름) + 워드마크(삐딱)를 한 덩어리로.
 *
 * 로고 PNG는 여백이 넉넉한 심볼만 있어서 그림만 쓰면 크기에 비해 존재감이 약하다.
 * 옆에 기울인 워드마크를 붙여 하나의 로고처럼 보이게 한다.
 * 그림이 없으면 워드마크만 크게 나온다.
 */
export function BrandLockup({
  src,
  symbolSize = 84,
  textSize = 62,
  className = '',
}: {
  src?: string | null
  symbolSize?: number
  textSize?: number
  className?: string
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {src && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt=""
          aria-hidden
          className="object-contain"
          style={{ height: symbolSize, width: 'auto' }}
        />
      )}
      <span
        className="inline-flex items-baseline gap-[1px] font-black leading-none tracking-[-0.045em] text-white"
        style={{ fontSize: textSize }}
      >
        <span className="tilt">삐딱</span>
        <span className="text-brand">.</span>
      </span>
    </span>
  )
}

/**
 * 삐딱 워드마크 — 시안의 .logo-bbiddak.
 * bbiddak.png 가 있으면 그림을, 없으면 기울인 타이포("삐딱.")를 쓴다.
 */
export function BbiddakWordmark({
  size = 76,
  src,
  className = '',
}: {
  /** 타이포일 때의 글자 크기(px). 이미지일 때는 이 값을 기준으로 높이를 잡는다 */
  size?: number
  src?: string | null
  className?: string
}) {
  if (src) {
    return (
      <span className={`inline-flex items-center ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="삐딱"
          className="object-contain"
          // 로고 PNG는 여백이 넉넉해서 타이포보다 크게 잡아야 시안과 무게가 맞는다
          style={{ height: size * 1.6, width: 'auto' }}
        />
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-baseline gap-[2px] font-black leading-none tracking-[-0.04em] ${className}`}
      style={{ fontSize: size }}
    >
      <span className="tilt text-brand">삐딱</span>
      <span className="text-brand">.</span>
    </span>
  )
}

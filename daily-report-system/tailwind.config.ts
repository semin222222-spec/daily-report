import type { Config } from 'tailwindcss'

/**
 * 시안(ppidak-report.html)의 :root CSS 변수를 그대로 옮긴 테마.
 * 색상 값의 단일 소스는 이 파일이며, globals.css의 CSS 변수와 값이 일치해야 한다.
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#f0542d', // 삐딱 시그니처
          deep: '#c33c17',
          ink: '#191512',
        },
        store: {
          bbiddak: '#f0542d',
          woosam: '#d98324',
          ssuk: '#4b7f52',
        },
        page: '#f6f5f2',
        surface: '#ffffff',
        line: {
          DEFAULT: '#e7e4dd',
          soft: '#efece5',
        },
        ink: {
          DEFAULT: '#171310',
          2: '#5c574f',
        },
        muted: '#8f897f',
        good: '#0ca30c',
        warn: '#fab219',
        bad: '#d03b3b',
        // 차트 시리즈 (시안 dataviz 검증본)
        s1: '#2a78d6',
        s2: '#008300',
        s3: '#eda100',
        s4: '#eb6834',
        s5: '#4a3aa7',
      },
      borderRadius: {
        card: '16px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,16,12,.05), 0 8px 24px rgba(20,16,12,.06)',
        land: '0 30px 80px rgba(0,0,0,.45)',
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Apple SD Gothic Neo',
          'Malgun Gothic',
          'sans-serif',
        ],
      },
      screens: {
        // 시안의 모바일 브레이크포인트(880px)에 맞춘 커스텀 스크린
        shell: '881px',
      },
    },
  },
  plugins: [],
}

export default config

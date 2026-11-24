/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // 한 번 본 화면은 30초 동안 브라우저가 기억해서, 메뉴를 오가거나 뒤로가기 할 때
    // 서버를 다시 기다리지 않고 바로 뜬다. 저장(서버 액션·router.refresh) 하면 즉시 새로 고친다.
    staleTimes: { dynamic: 30, static: 180 },
  },
}

module.exports = nextConfig

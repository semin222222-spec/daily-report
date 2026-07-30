/*
 * 삐딱 전용앱 서비스워커 (최소 구성).
 *
 * "홈 화면에 추가"가 뜨려면 fetch 핸들러가 있는 서비스워커가 하나 있어야 한다.
 * 지금은 오프라인 캐싱은 하지 않고 네트워크로 그대로 흘려보낸다.
 * (매장 데이터는 항상 최신이어야 해서 섣부른 캐싱은 오히려 위험하다)
 *
 * 나중에 정적 자산 캐싱을 붙이려면 이 파일에 캐시 로직을 추가하면 된다.
 */

self.addEventListener('install', () => {
  // 새 서비스워커를 곧바로 활성화
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  // 통과. 응답을 가로채지 않고 네트워크 그대로.
  event.respondWith(fetch(event.request))
})

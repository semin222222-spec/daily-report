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
  // 아무것도 가로채지 않는다(respondWith 호출 안 함) → 브라우저가 직접 처리.
  //
  // 예전에는 event.respondWith(fetch(event.request))로 모든 요청을 다시 보냈는데,
  // 아이폰 사파리는 서비스워커가 다시 보내는 요청에서 파일 본문을 빼먹는다.
  // 그래서 아이폰에서 점주센터 업로드가 0바이트로 가서 "No content provided"가 났다
  // (2026-11, Supabase 로그에서 content-length 0 확인).
  // 핸들러 자체는 "홈 화면에 추가" 설치 조건 때문에 남겨둔다.
})

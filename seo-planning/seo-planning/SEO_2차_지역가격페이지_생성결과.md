# 하루센스 SEO 2차: 지역 가격 페이지 생성 결과

생성일: 2026-06-10

## 생성 결과

실제 가격 데이터가 있는 지역/약물 조합만 생성했습니다. 빈 지역 페이지를 억지로 만들면 검색 품질에 불리할 수 있어 제외했습니다.

생성 페이지 수: 9개

## 생성된 지역 가격 페이지

- 마포구 마운자로 가격: https://harusense.com/mounjaro/seoul/mapo/
- 마포구 위고비 가격: https://harusense.com/wegovy/seoul/mapo/
- 서대문구 마운자로 가격: https://harusense.com/mounjaro/seoul/seodaemun/
- 관악구 마운자로 가격: https://harusense.com/mounjaro/seoul/gwanak/
- 영등포구 마운자로 가격: https://harusense.com/mounjaro/seoul/yeongdeungpo/
- 영등포구 위고비 가격: https://harusense.com/wegovy/seoul/yeongdeungpo/
- 용산구 마운자로 가격: https://harusense.com/mounjaro/seoul/yongsan/
- 광진구 마운자로 가격: https://harusense.com/mounjaro/seoul/gwangjin/
- 강서구 마운자로 가격: https://harusense.com/mounjaro/seoul/gangseo/

## 사이트맵 반영

`sitemap.xml`에 위 9개 지역 가격 페이지를 추가했습니다.

현재 사이트맵 요약:
- 전체 URL: 32개
- 기관 상세/기관 허브 URL: 15개
- 지역 가격 페이지 URL: 9개

## 업로드 필요 파일

- `mounjaro/seoul/` 폴더
- `wegovy/seoul/` 폴더
- `sitemap.xml`

## 건드리지 않은 것

- 메인 지도 앱 로직
- 지도핀/가격/재고 표시 로직
- 로그인/권한신청/비밀번호 변경 로직
- QR 방문 확인 로직
- Apps Script URL
- Cloudflare D1/API 코드

## 다음 권장 작업

1. 위 파일을 GitHub에 업로드합니다.
2. 배포 완료 후 아래 URL 2개를 직접 열어 확인합니다.
   - https://harusense.com/mounjaro/seoul/mapo/
   - https://harusense.com/wegovy/seoul/mapo/
3. Google Search Console에서 `sitemap.xml`을 다시 제출합니다.
4. 대표 URL 2~3개를 URL 검사로 색인 요청합니다.
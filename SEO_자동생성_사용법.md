# 하루센스 SEO 페이지 자동생성 사용법

목적: 신규기관이 늘어날 때 기관 상세페이지와 지역별 가격페이지를 손으로 만들지 않고 자동으로 갱신합니다.

## 언제 실행하나요?

아래 작업이 끝난 뒤 실행합니다.

1. `clinics.json`에 신규기관 좌표가 반영됨
2. 해당 기관에 가격/재고 정보가 들어감
3. 지역 정보가 정리됨: `sido`, `sigungu`, `sido_slug`, `sigungu_slug`, `region_key`

가격이 없는 기관은 SEO 상세/지역 가격페이지 대상에서 제외됩니다. 빈 페이지가 구글에 노출되는 것을 막기 위해서입니다.

## 실행 방법

작업 폴더에서 아래 파일을 실행합니다.

`tools/generate-seo-pages.js`

실행하면 자동으로 갱신되는 것:

- `clinic/` 기관 상세페이지
- `mounjaro/{지역}/` 마운자로 지역 가격페이지
- `wegovy/{지역}/` 위고비 지역 가격페이지
- `sitemap.xml`
- `seo-planning/SEO_자동생성_실행결과.md`

## GitHub에 올릴 것

- `clinic` 폴더
- `mounjaro` 폴더
- `wegovy` 폴더
- `sitemap.xml`
- `tools/generate-seo-pages.js` 1회 업로드 권장
- `SEO_자동생성_사용법.md` 1회 업로드 권장

## 건드리지 않는 것

- 메인 지도 `index.html`
- 영문 지도 `en/index.html`
- 로그인/권한신청/QR/API 코드
- Apps Script
- Google 지도 핀 로직

## 운영 의미

신규기관이 들어오면 지도에만 추가되는 것이 아니라, 검색엔진이 읽을 수 있는 정적 상세페이지와 지역 가격페이지도 함께 늘어납니다.

예:

- `강서구 마운자로 가격`
- `마포구 위고비 가격`
- `뉴센스의원 마운자로 가격`

이런 검색어를 받을 수 있는 페이지가 자동으로 생기는 구조입니다.
## 올리기 전 필수 검수

SEO 페이지를 생성한 뒤 아래 검사를 한 번 실행하세요.

```powershell
node tools/check-seo-output.js
```

확인하는 것:
- 지역명이 ???로 깨졌는지
- clinics.json의 시도/시군구/slug/region_key가 비어 있는지
- sitemap.xml에 /item/ 같은 잘못된 주소가 남았는지
- 생성된 clinic/mounjaro/wegovy 페이지 안에 ???가 있는지

검사가 `"ok": true`이면 GitHub에 올리면 됩니다.
# 하루센스 SEO 업로드 운영 메모

## 목적

이 폴더의 SEO 작업은 메인 지도나 로그인 기능을 바꾸는 작업이 아닙니다.

대상은 아래 파일들입니다.

- `clinic/`
- `mounjaro/`
- `wegovy/`
- `sitemap.xml`
- `seo-planning/`
- `data/treatments.catalog.json`
- `tools/generate-seo-pages.js`
- `tools/check-*.js`

## 안전 원칙

- `index.html`은 이 작업에 포함하지 않습니다.
- `en/index.html`은 이 작업에 포함하지 않습니다.
- `clinics.json`은 이 작업에 포함하지 않습니다.
- `functions/api/`는 이 작업에 포함하지 않습니다.
- Apps Script는 이 작업에 포함하지 않습니다.

즉, 지도 표시, 로그인, QR, 가격 저장 기능은 그대로 둔 상태에서 SEO 상세페이지 파일만 갱신합니다.

## 실행 방법

`SEO_업로드묶음_만들기.bat` 파일을 더블클릭합니다.

성공하면 아래와 같은 폴더가 새로 생깁니다.

`C:\Users\user\Documents\Codex\harusense_UPLOAD_ONLY_seo_release_날짜`

이 폴더 안의 파일과 폴더만 GitHub 루트에 업로드하면 됩니다.

## 업로드 후 확인 주소

- https://harusense.com/clinic/12339695-newsense/
- https://harusense.com/mounjaro/seoul/mapo/
- https://harusense.com/wegovy/seoul/mapo/
- https://harusense.com/sitemap.xml

## 현재 공개 범위

추가 진료 항목은 아직 뉴센스의원만 시범 공개입니다.

모든 기관으로 열려면 별도 승인 후 `data/service-profile-allowlist.json` 정책을 바꿔야 합니다.

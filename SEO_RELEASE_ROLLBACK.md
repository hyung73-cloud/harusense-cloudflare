# Harusense SEO Release Rollback Guide

이 문서는 SEO 상세페이지 업로드 후 문제가 생겼을 때, 메인 지도와 로그인 시스템을 건드리지 않고 되돌리는 절차입니다.

## 이 묶음의 범위

이번 SEO 업로드 묶음은 아래 항목만 바꿉니다.

- `clinic/`
- `mounjaro/`
- `wegovy/`
- `sitemap.xml`
- `seo-planning/`
- SEO 생성 도구와 운영 문서

아래 파일과 기능은 포함하지 않습니다.

- `index.html`
- `en/index.html`
- `clinics.json`
- `functions/api/`
- Apps Script
- 로그인, QR, 가격 저장, 지도핀 표시 로직

## 문제가 생겼을 때 먼저 확인할 것

1. 메인 지도와 로그인 문제가 맞는지 확인합니다.
   - 이 묶음에는 메인 지도와 로그인 파일이 없으므로, 문제 원인이 이 묶음이 아닐 가능성이 큽니다.

2. 문제가 SEO 상세페이지에서만 보이는지 확인합니다.
   - 예: `/clinic/12339695-newsense/`
   - 예: `/mounjaro/seoul/mapo/`
   - 예: `/wegovy/seoul/mapo/`

3. 문제가 SEO 상세페이지에만 있다면, 직전 업로드 묶음으로 되돌립니다.

## 되돌리는 방법

GitHub에서 직전 정상 묶음의 아래 항목을 다시 업로드합니다.

- `clinic/`
- `mounjaro/`
- `wegovy/`
- `sitemap.xml`
- `seo-planning/`

Cloudflare Pages 배포가 성공하면 아래 주소를 확인합니다.

- `https://harusense.com/clinic/12339695-newsense/`
- `https://harusense.com/mounjaro/seoul/mapo/`
- `https://harusense.com/wegovy/seoul/mapo/`
- `https://harusense.com/sitemap.xml`

## 절대 하지 말 것

- 문제 원인을 모른 채 `index.html`을 덮어쓰지 않습니다.
- 문제 원인을 모른 채 `functions/api/`를 수정하지 않습니다.
- 문제 원인을 모른 채 Apps Script를 새 배포하지 않습니다.
- `clinics.json`을 같이 올리지 않습니다.

## 현재 공개 원칙

- GLP-1 가격 지도는 전체 공개 상태입니다.
- 수액, 보톡스, 예방접종 등 추가 진료 항목은 뉴센스의원만 시범 공개합니다.
- 전체 공개 전환은 `SERVICE_PROFILE_ROLLOUT.md` 절차를 따른 뒤 진행합니다.

# 하루센스 SEO 6차: Breadcrumb 구조화 데이터 보강 결과

생성일: 2026-06-10

## 목적

검색엔진이 하루센스 SEO 페이지 구조를 더 잘 이해하도록 BreadcrumbList 구조화 데이터를 추가했습니다.

## 처리 결과

- Breadcrumb 추가 페이지: 26개

## 적용 범위

- `/clinic/` 기관 허브
- `/clinic/{기관}/` 기관 상세페이지 14개
- `/mounjaro/seoul/`, `/wegovy/seoul/` 서울 허브
- `/mounjaro/seoul/{지역}/`, `/wegovy/seoul/{지역}/` 지역 가격페이지

## 건드리지 않은 것

- 메인 지도 앱
- 지도핀/가격/재고 표시 로직
- 로그인/권한신청/비밀번호 변경
- QR 방문 확인
- Apps Script URL
- Cloudflare D1/API 코드
- sitemap.xml

## 백업

- `seo-pages.before-breadcrumb-20260610-124900`

## 업로드 필요

- `clinic` 폴더
- `mounjaro/seoul` 폴더
- `wegovy/seoul` 폴더

## 확인 URL

- https://harusense.com/clinic/12339695-newsense/
- https://harusense.com/mounjaro/seoul/mapo/
- https://harusense.com/wegovy/seoul/mapo/
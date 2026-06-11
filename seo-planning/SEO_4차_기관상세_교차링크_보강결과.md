# 하루센스 SEO 4차: 기관 상세페이지 교차 링크 보강 결과

생성일: 2026-06-10

## 목적

기관 상세페이지가 독립적으로만 존재하지 않고, 같은 지역의 마운자로/위고비 가격 페이지와 연결되도록 내부 링크를 추가했습니다.

## 처리 결과

- 기관 상세페이지 수정: 14개
- 건너뜀: 0개

## 추가된 요소

각 기관 상세페이지 하단에 `이 지역 가격 더 보기` 섹션을 추가했습니다.

예시:
- 마포구 기관 → `/mounjaro/seoul/mapo/`, `/wegovy/seoul/mapo/`
- 영등포구 기관 → `/mounjaro/seoul/yeongdeungpo/`, `/wegovy/seoul/yeongdeungpo/`
- 위고비 지역 페이지가 아직 없는 지역은 마운자로 지역 페이지만 연결

## 건드리지 않은 것

- 메인 지도 앱
- 지도핀/가격/재고 표시 로직
- 로그인/권한신청/비밀번호 변경
- QR 방문 확인
- Apps Script URL
- Cloudflare D1/API 코드
- sitemap.xml

## 백업

- C:\Users\user\Desktop\harusense-deploy_작업본_보존\clinic.before-seo-crosslinks-20260610-092500

## 업로드 필요

- `clinic` 폴더

## 확인 URL

- https://harusense.com/clinic/12339695-newsense/
- https://harusense.com/clinic/clinic_excel_005_item-seoyeouido/
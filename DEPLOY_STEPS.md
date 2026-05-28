# 하루센스 병원 관계자 수정 기능 배포 절차

이 버전은 두 방식으로 동작합니다.

1. API가 없는 일반 정적 호스팅
   - 기존처럼 clinics.json을 읽습니다.
   - 병원 관계자 수정 탭은 현재 기기 미리보기로만 즉시 반영됩니다.

2. Cloudflare Pages + D1 연결
   - /api/clinics 에서 DB 데이터를 읽습니다.
   - 병원 관계자가 제출하면 /api/update-clinic 으로 DB에 저장됩니다.
   - 모든 방문자에게 최신 가격/재고가 반영됩니다.

## 포함 파일

- index.html
- clinics.json
- schema.sql
- seed.sql
- wrangler.toml
- functions/api/clinics.js
- functions/api/login.js
- functions/api/update-clinic.js

## 뉴센스의원 테스트 로그인

- 아이디: 12339695
- 비밀번호: h12339695

## Cloudflare 배포 순서

1. Cloudflare Pages 프로젝트를 만듭니다.
2. 현재 폴더 파일을 업로드하거나 GitHub에 연결합니다.
3. D1 데이터베이스를 만듭니다.
   - 예: harusense-db
4. wrangler.toml의 database_id를 실제 D1 database_id로 바꿉니다.
5. D1 콘솔에서 schema.sql을 실행합니다.
6. 이어서 seed.sql을 실행합니다.
7. Pages 프로젝트 설정에서 D1 binding을 추가합니다.
   - binding 이름: HARUSENSE_DB
   - database: harusense-db
8. 다시 배포합니다.
9. harusense.com에서 병원 관계자 수정 탭을 열어 테스트합니다.

## 작동 방식

- /api/clinics
  - 지도에 표시할 병원/가격/재고 데이터를 DB에서 읽습니다.

- /api/login
  - 요양기관번호와 비밀번호를 확인합니다.
  - 비밀번호 규칙은 h + 요양기관번호입니다.

- /api/update-clinic
  - 로그인한 요양기관번호 병원의 가격/재고만 수정합니다.
  - change_logs에 변경 전/후 값을 저장합니다.

## 주의

현재 비밀번호 규칙은 매우 단순합니다. 초기 MVP에는 적합하지만, 병원이 늘어나면 병원별 별도 코드 또는 문자 인증으로 강화하는 것을 권장합니다.

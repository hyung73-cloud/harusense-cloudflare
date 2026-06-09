
## 2026-06-09 Region Picker Phase 1-A

수정 파일:
- index.html
- en/index.html

추가/변경:
- Cursor가 만든 Region Picker UI 골격은 유지하고, JS 연결 로직만 추가했습니다.
- `state.region` 추가: `{ sidoSlug, sigunguSlug, legacyDistrict }`
- `/data/regions.json`을 읽어 지역 선택 옵션을 갱신합니다.
- 실제 기관 데이터에 존재하는 legacy district 기준으로 시군구 옵션을 제한합니다.
- 지역 적용 시 기존 hidden `#districtBar` chip을 우선 클릭해서 기존 필터/지도 포커스 로직을 재사용합니다.
- hidden chip이 없는 지역은 `state.districtFilter`와 `focusMapByRegion()` fallback으로 처리합니다.
- URL 동기화 추가: `?sido=...&sigungu=...`
- `commitClinicData()` 이후 Region Picker 옵션을 갱신합니다.

건드리지 않음:
- renderMarkers 지도핀 생성 로직
- 가격/재고 병합 로직
- 로그인/권한/API 파일
- Apps Script
- D1 DB 스키마
- QR 피드백 로직
- Cursor가 만든 HTML/CSS 클래스명/디자인 토큰

검증:
- index.html inline script 문법 검사 통과
- en/index.html inline script 문법 검사 통과
- data/regions.json JSON 파싱 통과
# 하루센스 추가 진료 항목 롤아웃 가이드

이 문서는 수액, 보톡스, 예방접종 같은 GLP-1 외 추가 진료 항목을 안전하게 여는 절차입니다.

## 현재 원칙

- 지금은 뉴센스의원만 시범 운영합니다.
- 다른 기관에는 추가 진료 항목 입력창과 상세페이지 노출 영역을 열지 않습니다.
- 전체 오픈은 `data/service-profile-allowlist.json`의 `mode`를 바꿀 때만 진행합니다.

## 현재 안전 모드

`data/service-profile-allowlist.json`

```json
{
  "mode": "allowlist",
  "enabled_institution_nos": ["12339695"]
}
```

이 상태에서는 뉴센스의원만 추가 진료 항목이 열립니다.

## 특정 기관 1곳만 추가로 열기

예를 들어 요양기관번호 `11112222` 기관을 추가로 열고 싶을 때:

```json
{
  "mode": "allowlist",
  "enabled_institution_nos": ["12339695", "11112222"]
}
```

그 다음 확인 순서:

1. `data/service-profile-allowlist.json` 수정
2. 해당 기관 상세페이지 재생성
3. 관계자 로그인 수정창에 수액, 보톡스, 예방접종 입력창이 보이는지 확인
4. 해당 기관 상세페이지에 추가 진료 항목이 보이는지 확인

## 전체 기관에 열기

뉴센스의원 시범 운영이 충분히 안정된 뒤에만 아래처럼 바꿉니다.

```json
{
  "mode": "all",
  "enabled_institution_nos": ["12339695"]
}
```

`mode: all`이면 `enabled_institution_nos` 목록과 관계없이 모든 기관에 추가 진료 항목이 열립니다.

## 배포 전 점검

상세페이지 노출 범위 확인:

```bash
node tools/check-service-profile-output.js
```

다른 출력 폴더를 확인할 때:

```bash
node tools/check-service-profile-output.js C:\path\to\generated-output
```

정상 예시:

```json
{
  "ok": true,
  "mode": "allowlist",
  "serviceProfilePages": 1,
  "allowedInstitutionNos": ["12339695"],
  "serviceInstitutionNos": ["12339695"]
}
```

품목을 추가하거나 이름을 바꾼 뒤에는 아래 검사를 먼저 실행합니다.

```bash
node tools/check-service-catalog-sync.js
```

이 검사는 `index.html`, `en/index.html`, `tools/generate-seo-pages.js`, `data/treatments.catalog.json`의 수액, 보톡스, 예방접종 품목 키가 모두 같은지 확인합니다. 하나라도 빠지면 저장 화면에는 있는데 상세페이지에는 안 보이는 문제가 생길 수 있습니다.

## 론칭 전 확인 목록

- 뉴센스의원 관계자 로그인 수정창에 수액, 보톡스, 예방접종 입력창이 보이는가
- 뉴센스의원 상세페이지에 추가 진료 항목이 보이는가
- 다른 기관 상세페이지에는 추가 진료 항목이 보이지 않는가
- `mode`가 실수로 `all`이 되어 있지 않은가
- 가격, 재고, 지도, 로그인, QR 기능은 그대로 동작하는가

## 주의

- `mode: all`은 전체 오픈 스위치입니다. 테스트 중에는 사용하지 않습니다.
- 신규 항목을 추가할 때는 먼저 뉴센스의원에서만 테스트합니다.
- 특정 기관에만 열고 싶으면 `allowlist`에 요양기관번호를 하나씩 추가합니다.

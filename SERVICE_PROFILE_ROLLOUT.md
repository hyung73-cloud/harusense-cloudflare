# 하루센스 추가 진료 항목 롤아웃 가이드

이 문서는 수액/보톡스/예방접종 등 GLP-1 외 추가 진료 항목을 안전하게 여는 절차입니다.

## 현재 원칙

- 기본 상태는 뉴센스의원만 테스트합니다.
- 다른 기관에는 추가 진료 항목 입력판과 상세페이지 영역을 보이지 않게 합니다.
- 전체 오픈은 `data/service-profile-allowlist.json`의 `mode`를 바꿀 때만 진행합니다.

## 현재 안전 모드

`data/service-profile-allowlist.json`

```json
{
  "mode": "allowlist",
  "enabled_institution_nos": ["12339695"]
}
```

이 상태에서는 뉴센스의원만 열립니다.

## 특정 기관 1곳만 추가할 때

예: 요양기관번호 `11112222` 기관을 추가로 열고 싶을 때

```json
{
  "mode": "allowlist",
  "enabled_institution_nos": ["12339695", "11112222"]
}
```

그 뒤 해야 할 일:

1. `data/service-profile-allowlist.json` 수정
2. 해당 기관 상세페이지 재생성
3. 관계자 로그인에서 입력판이 보이는지 확인
4. 해당 기관 상세페이지에 추가 진료 항목이 보이는지 확인

## 전체 기관에 오픈할 때

충분히 테스트가 끝난 뒤에만 아래처럼 바꿉니다.

```json
{
  "mode": "all",
  "enabled_institution_nos": ["12339695"]
}
```

`mode: all`이면 `enabled_institution_nos` 목록과 관계없이 모든 기관에 추가 진료 항목이 열립니다.

## 배포 전 검사

생성 후 아래 도구로 확인합니다.

```bash
node tools/check-service-profile-output.js
```

또는 별도 생성 폴더를 검사할 때:

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

## 론칭 전 확인 목록

- 뉴센스의원 관계자 로그인 수정창에 수액/보톡스/예방접종 입력판이 보이는가
- 뉴센스의원 상세페이지에 추가 진료 항목이 보이는가
- 다른 기관 상세페이지에는 추가 진료 항목이 보이지 않는가
- `mode`가 실수로 `all`이 되어 있지 않은가
- 가격/재고/지도핀/로그인/QR 기능이 그대로 동작하는가

## 주의

- `mode: all`은 전체 오픈 스위치입니다. 테스트 중에는 사용하지 않습니다.
- 신규 품목을 추가할 때는 먼저 뉴센스의원에서만 테스트합니다.
- 특정 기관에만 열고 싶으면 `allowlist`에 요양기관번호를 하나씩 추가합니다.

# 기관 상세페이지 템플릿 v1 — Codex 연동 가이드

> 작성: Cursor · 2026-06-10  
> 범위: **템플릿만** (live `clinic/*.html`, `generate-seo-pages.js` 미반영)

## 파일

| 파일 | 용도 |
|------|------|
| `clinic-detail.css` | 전용 스타일 (`.cd-*` prefix) |
| `clinic-detail.body.html` | `renderClinicPage()` body placeholder |
| `clinic-detail.preview.html` | 브라우저 미리보기 (noindex) |

## 미리보기 방법

PC에서 더블클릭 또는:

```
templates/clinic-detail.preview.html
```

보톡스·수액 가격은 **디자인 샘플**입니다. live 데이터 아님.

## 디자인 방향 A 요약

- 기존 SEO 페이지 hero + chip + soft bg 유지
- 단일 대형 table → **그룹 카드 3개** (GLP-1 / 보톡스 / 수액·주사)
- GLP-1: product별 compact table (마운자로, 위고비)
- 보톡스·수액: 2열 service grid (모바일 1열)
- CTA: **GLP-1 지도만** (`map_enabled` 그룹)

## catalog 연동 규칙

```
data/treatments.catalog.json
  groups[]
    glp1   → .cd-group.is-glp1   map_enabled=true  → 지도 CTA
    botox  → .cd-group.is-botox  map_enabled=false → 상세만
    iv     → .cd-group.is-iv      map_enabled=false → 상세만
```

### 가격 key (clinics.json prices)

| product | key 예 |
|---------|--------|
| mounjaro | `mounjaro_2.5mg` |
| wegovy | `wegovy_0.25mg` |
| 이마보톡스 | `botox_forehead_1회` |
| 영양수액 | `iv_nutrition_1회` |

### 표시 / 숨김

1. **group**: 그룹 내 product 중 1개라도 가격 있으면 `.cd-group` 출력, 없으면 **전체 생략**
2. **product (glp1)**: 해당 product variant 0개면 `.cd-product` 생략
3. **service item**: 해당 key 가격 없으면 `.cd-service-item` 생략
4. **region links**: `group.seo_enabled === true` product만 (현재 mounjaro, wegovy)
5. **지도 CTA**: `map_enabled === true` 그룹이 있고 GLP-1 가격 있을 때만

## generate-seo-pages.js 연동 체크리스트

- [ ] `pageShell` inline CSS → `clinic-detail.css` 내용 inline 또는 `<style>` include
- [ ] `renderClinicPage` body → `clinic-detail.body.html` 구조로 교체
- [ ] `catalog` + `clinic.prices` loop
- [ ] title/description: 동적 품목명 (GLP-1만 → GLP-1+보톡스 등)
- [ ] `clinicPriceTable()` 단일 함수 → group renderer로 분리
- [ ] 실행: `node tools/generate-seo-pages.js`
- [ ] 검수: `node tools/check-seo-output.js`

## class / id 계약 (변경 시 Codex와 협의)

### 그룹
- `.cd-group.is-glp1|is-botox|is-iv`
- `#cd-group-{group_key}`
- `data-group-key`

### product / price
- `.cd-product[data-product-key]`
- `.cd-service-item[data-price-key]`
- `.cd-price`, `.cd-stock`, `.is-hidden`

### CTA
- `.cd-cta-map` → `/?clinic={institution_no}` only

## GitHub 업로드 (템플릿 단계)

**지금 올릴 것 (선택):**
- `templates/clinic-detail.css`
- `templates/clinic-detail.body.html`
- `templates/clinic-detail.preview.html`
- `templates/README_CLINIC_DETAIL.md`

**아직 올리지 않음:**
- `clinic/` (재생성 전까지 live 유지)
- `tools/generate-seo-pages.js` (Codex 연동 후)

## index.html 지도

- **변경 없음** — 지도 표시는 GLP-1만 (`map_enabled: true`)
- 보톡스/수액은 SEO clinic detail에만 노출

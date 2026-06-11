const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT_ROOT = process.env.HARUSENSE_SEO_OUTPUT_ROOT ? path.resolve(process.env.HARUSENSE_SEO_OUTPUT_ROOT) : ROOT;
const SITE = "https://harusense.com";
const TODAY = new Date().toISOString().slice(0, 10);
const PUBLIC_SERVICE_DETAIL_ENABLED = false;

const REGION_NAMES = {
  seoul: "서울특별시", gyeonggi: "경기도", incheon: "인천광역시", busan: "부산광역시",
  daegu: "대구광역시", daejeon: "대전광역시", gwangju: "광주광역시", ulsan: "울산광역시",
  sejong: "세종특별자치시", gangwon: "강원특별자치도", chungbuk: "충청북도", chungnam: "충청남도",
  jeonbuk: "전북특별자치도", jeonnam: "전라남도", gyeongbuk: "경상북도", gyeongnam: "경상남도", jeju: "제주특별자치도"
};
const SIGUNGU_NAMES = {
  mapo: "마포구", seodaemun: "서대문구", yeongdeungpo: "영등포구", gangseo: "강서구", yongsan: "용산구",
  gwanak: "관악구", dongjak: "동작구", jongno: "종로구", yangcheon: "양천구", nowon: "노원구",
  gwangjin: "광진구", gangnam: "강남구", seocho: "서초구", songpa: "송파구", gangdong: "강동구",
  seongdong: "성동구", jung: "중구", seongbuk: "성북구", gangbuk: "강북구", dobong: "도봉구",
  eunpyeong: "은평구", guro: "구로구", geumcheon: "금천구", jungnang: "중랑구",
  goyang: "고양시", seongnam: "성남시", suwon: "수원시", ansan: "안산시", yongin: "용인시", bucheon: "부천시"
};
const DISTRICT_SLUGS = {
  "마포구": "mapo", "서대문구": "seodaemun", "영등포구": "yeongdeungpo", "강서구": "gangseo", "용산구": "yongsan",
  "관악구": "gwanak", "동작구": "dongjak", "종로구": "jongno", "양천구": "yangcheon", "노원구": "nowon",
  "광진구": "gwangjin", "강남구": "gangnam", "서초구": "seocho", "송파구": "songpa", "강동구": "gangdong",
  "성동구": "seongdong", "중구": "jung", "성북구": "seongbuk", "강북구": "gangbuk", "도봉구": "dobong",
  "은평구": "eunpyeong", "구로구": "guro", "금천구": "geumcheon", "중랑구": "jungnang",
  "고양시": "goyang", "성남시": "seongnam", "수원시": "suwon", "안산시": "ansan", "용인시": "yongin", "부천시": "bucheon"
};
const LEGACY_CLINIC_SLUGS = {
  "clinic_12339695": "12339695-newsense",
  "clinic_excel_001_item": "clinic_excel_001_item-seoulbaram",
  "clinic_excel_002_item": "clinic_excel_002_item-weviang",
  "clinic_excel_003_item": "clinic_excel_003_item-yonsei-withus",
  "clinic_excel_004_item": "clinic_excel_004_item-nakseongdae-ttobon",
  "clinic_excel_005_item": "clinic_excel_005_item-seoyeouido",
  "clinic_excel_006_item": "clinic_excel_006_item-lohas",
  "clinic_excel_007_item": "clinic_excel_007_item-drkim-ent",
  "clinic_excel_009_item": "clinic_excel_009_item-vands",
  "clinic_excel_020_item": "clinic_excel_020_item-samsung-shinnae",
  "clinic_excel_021_item": "clinic_excel_021_item-gangseo-imu",
  "pharmacy_01_item": "pharmacy_01_item-tuntun-pharmacy",
  "pharmacy_02_item": "pharmacy_02_item-malgeun-pharmacy",
  "pharmacy_03_item": "pharmacy_03_item-seran-pharmacy"
};

function stripBom(text) { return String(text || "").replace(/^\uFEFF/, ""); }
function readText(file) { return stripBom(fs.readFileSync(path.join(ROOT, file), "utf8")); }
function readJson(file) { return JSON.parse(readText(file)); }
function readJsonFlexible(file) {
  if (path.isAbsolute(file)) return JSON.parse(stripBom(fs.readFileSync(file, "utf8")));
  return readJson(file);
}
function readOptionalText(file) { try { return readText(file); } catch { return ""; } }
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function write(file, html) { const target = path.join(OUT_ROOT, file); ensureDir(path.dirname(target)); fs.writeFileSync(target, html, "utf8"); }
function esc(value) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function money(value) { return Number.isFinite(Number(value)) ? Number(value).toLocaleString("ko-KR") + "원" : "정보 수집중"; }
function canonical(pathname) { return `${SITE}${pathname}`; }
function cleanRegionText(value) { const text = String(value || "").trim(); return text && !text.includes("?") ? text : ""; }
function slugifyLoose(value) { return String(value || "").toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-+|-+$/g, "") || "item"; }
function priceKey(product, variant) { return product.unit_type === "service" ? product.price_key_prefix : `${product.price_key_prefix}_${variant}`; }
function productHasPrice(clinic, product) { return (product.variants || []).some(variant => Number.isFinite(Number(clinic.prices?.[priceKey(product, variant)]))); }
function groupHasPrice(clinic, group) { return (group.products || []).some(product => productHasPrice(clinic, product)); }
function lowestProductPrice(clinic, product) { const prices = (product.variants || []).map(variant => Number(clinic.prices?.[priceKey(product, variant)])).filter(Number.isFinite); return prices.length ? Math.min(...prices) : null; }
function hasAnyCatalogPrice(clinic, catalog) { return (catalog.groups || []).some(group => groupHasPrice(clinic, group)); }
function validCoords(clinic) { return Number.isFinite(Number(clinic.lat)) && Number.isFinite(Number(clinic.lng)); }
function isDemo(clinic) { const id = String(clinic.id || "").toLowerCase(); const name = String(clinic.name || ""); return id.includes("sample") || id.includes("fallback") || name.includes("샘플"); }
function typeLabel(clinic) { return clinic.type === "pharmacy" || String(clinic.name || "").includes("약국") ? "약국" : "병·의원"; }
function clinicSlug(clinic) { if (LEGACY_CLINIC_SLUGS[clinic.id]) return LEGACY_CLINIC_SLUGS[clinic.id]; const no = String(clinic.institution_no || "").trim(); if (no) return `${no}-${slugifyLoose(clinic.name).slice(0, 32)}`; return `${slugifyLoose(clinic.id || "clinic")}-${slugifyLoose(clinic.name).slice(0, 32)}`; }
function regionSlugParts(clinic) { const sidoSlug = clinic.sido_slug || (clinic.region_key ? String(clinic.region_key).split("/")[0] : "") || "seoul"; const sigunguSlug = clinic.sigungu_slug || DISTRICT_SLUGS[clinic.sigungu] || DISTRICT_SLUGS[clinic.district] || slugifyLoose(clinic.sigungu || clinic.district); return { sidoSlug, sigunguSlug }; }
function clinicSidoName(clinic) { const parts = regionSlugParts(clinic); return cleanRegionText(clinic.sido) || REGION_NAMES[parts.sidoSlug] || parts.sidoSlug || ""; }
function clinicSigunguName(clinic) { const parts = regionSlugParts(clinic); return cleanRegionText(clinic.sigungu) || cleanRegionText(clinic.district) || SIGUNGU_NAMES[parts.sigunguSlug] || parts.sigunguSlug || ""; }
function regionLabel(clinic) { return `${clinicSidoName(clinic)} ${clinicSigunguName(clinic)}`.trim(); }
function hasUsableRegion(clinic) { const parts = regionSlugParts(clinic); const label = clinicSigunguName(clinic); return Boolean(parts.sidoSlug && parts.sigunguSlug && parts.sigunguSlug !== "item" && label); }
function stockLabel(clinic, key) { return clinic.stock?.[key] === false ? "확인 필요" : "재고 있음"; }
function stockClass(clinic, key) { return clinic.stock?.[key] === false ? "is-unknown" : ""; }
function phoneTel(phone) { return String(phone || "").replace(/[^0-9+]/g, ""); }
function breadcrumbJson(items) { return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: canonical(item.url) })) }; }

function flattenProducts(catalog) { return (catalog.groups || []).flatMap(group => (group.products || []).map(product => ({ ...product, group }))); }
function seoProducts(catalog) { return flattenProducts(catalog).filter(product => product.group?.seo_enabled); }
function mapEnabledGroups(catalog) { return (catalog.groups || []).filter(group => group.map_enabled); }
function primarySeoProductNames(clinic, catalog) { return seoProducts(catalog).filter(product => productHasPrice(clinic, product)).map(product => product.ko); }
function pageTitleTreatmentPart(clinic, catalog) { const names = primarySeoProductNames(clinic, catalog); return names.length ? names.join("·") : "가격"; }

function baseCss() {
  const templateCss = readOptionalText("templates/clinic-detail.css");
  const shellCss = `
    *{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Pretendard",system-ui,sans-serif;color:#111827;background:#f6f7fb;line-height:1.65}a{color:inherit}.cd-header{background:#fff;border-bottom:1px solid #e5e7eb;position:sticky;top:0;z-index:3}.cd-header-inner{max-width:980px;margin:0 auto;padding:18px 20px;display:flex;justify-content:space-between;gap:16px;align-items:center}.cd-brand{font-weight:800;text-decoration:none;color:#111827}.cd-back{color:#2563eb;text-decoration:none;font-weight:700;font-size:14px}.cd-main{max-width:980px;margin:0 auto;padding:28px 20px 64px}@media(max-width:640px){.cd-header-inner{padding:14px 16px}.cd-main{padding:18px 14px 48px}}
  `;
  return shellCss + "\n" + templateCss;
}

function pageShell({ title, description, canonicalPath, body, jsonLd = [] }) {
  const json = jsonLd.length ? jsonLd.map(item => `<script type="application/ld+json">${JSON.stringify(item)}</script>`).join("\n") : "";
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${canonical(canonicalPath)}">
  ${json}
  <style>${baseCss()}</style>
</head>
<body>
  <header class="cd-header"><div class="cd-header-inner"><a class="cd-brand" href="/">하루센스 마운자로·위고비 가격지도</a><a class="cd-back" href="/">← 지도로</a></div></header>
  <main class="cd-main">${body}</main>
</body>
</html>`;
}

function renderTreatmentNav(clinic, catalog) {
  const groups = (catalog.groups || []).filter(group => (group.group_key === "glp1" || PUBLIC_SERVICE_DETAIL_ENABLED) && groupHasPrice(clinic, group));
  if (groups.length < 2) return "";
  return `<nav class="cd-treatment-nav" aria-label="표시 품목">${groups.map(group => `<a class="cd-treatment-pill is-${esc(group.group_key)}" href="#cd-group-${esc(group.group_key)}">${esc(group.ko)}</a>`).join("")}</nav>`;
}

function renderGlpProduct(clinic, product) {
  const rows = (product.variants || []).map(variant => {
    const key = priceKey(product, variant);
    const price = clinic.prices?.[key];
    if (!Number.isFinite(Number(price))) return "";
    return `<tr data-price-key="${esc(key)}"><td>${esc(variant)}</td><td class="cd-price">${money(price)}</td><td class="cd-stock ${stockClass(clinic, key)}">${stockLabel(clinic, key)}</td></tr>`;
  }).filter(Boolean).join("\n");
  if (!rows) return "";
  return `<div class="cd-product" data-product-key="${esc(product.product_key)}"><p class="cd-product-title">${esc(product.ko)} <span>${product.unit_type === "dose" ? "용량별" : "가격"}</span></p><table class="cd-price-table"><thead><tr><th>${product.unit_type === "dose" ? "용량" : "항목"}</th><th>표시 가격</th><th>재고</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderServiceProduct(clinic, product) {
  return (product.variants || []).map(variant => {
    const key = priceKey(product, variant);
    const price = clinic.prices?.[key];
    if (!Number.isFinite(Number(price))) return "";
    return `<div class="cd-service-item" data-price-key="${esc(key)}"><span class="cd-service-name">${esc(product.ko)}</span><span class="cd-service-price">${money(price)}</span><span class="cd-service-meta">${esc(variant)} 기준</span></div>`;
  }).filter(Boolean).join("\n");
}

function renderGroup(clinic, group) {
  if (!groupHasPrice(clinic, group)) return "";
  const isGlp = group.group_key === "glp1";
  const productHtml = (group.products || []).map(product => isGlp ? renderGlpProduct(clinic, product) : renderServiceProduct(clinic, product)).filter(Boolean).join("\n");
  if (!productHtml) return "";
  const body = isGlp ? productHtml : `<div class="cd-service-grid">${productHtml}</div>`;
  const badge = group.map_enabled ? "지도 표시" : "상세페이지";
  return `<section class="cd-group is-${esc(group.group_key)}" id="cd-group-${esc(group.group_key)}" data-group-key="${esc(group.group_key)}"><div class="cd-group-head"><h3>${esc(group.ko)} <span class="cd-group-badge">${badge}</span></h3></div><div class="cd-group-body">${body}</div></section>`;
}

function renderAllTreatmentGroups(clinic, catalog) {
  return (catalog.groups || []).filter(group => group.group_key === "glp1" || PUBLIC_SERVICE_DETAIL_ENABLED).map(group => renderGroup(clinic, group)).filter(Boolean).join("\n");
}

function regionLinksForClinic(clinic, catalog) {
  const links = [];
  const { sidoSlug, sigunguSlug } = regionSlugParts(clinic);
  const sigunguName = clinicSigunguName(clinic);
  for (const product of seoProducts(catalog)) {
    if (!productHasPrice(clinic, product)) continue;
    links.push(`<a class="cd-chip cd-chip-primary" href="/${product.root}/${sidoSlug}/${sigunguSlug}/">${esc(sigunguName)} ${esc(product.ko)} 가격</a>`);
  }
  return links.length ? links.join("\n") : "";
}

function renderClinicPage(clinic, catalog) {
  const slug = clinicSlug(clinic);
  const pathName = `/clinic/${slug}/`;
  const treatmentPart = pageTitleTreatmentPart(clinic, catalog);
  const regionLinks = regionLinksForClinic(clinic, catalog);
  const mapGroups = mapEnabledGroups(catalog).filter(group => groupHasPrice(clinic, group));
  const hasMapCta = mapGroups.length > 0;
  const mapDeepLink = `/?clinic=${encodeURIComponent(clinic.institution_no || clinic.id)}`;
  const naverUrl = clinic.naver_url || clinic.naverMapUrl || "";
  const providerNote = clinic.provider_note || clinic.notes || "";
  const parkingText = clinic.parking_available || clinic.provider_parking || "";
  const updatedAt = clinic.updated_at ? String(clinic.updated_at).slice(0, 10) : "";
  const address = clinic.address || regionLabel(clinic);
  const phone = clinic.phone || "";
  const body = `
<div class="cd-breadcrumbs"><a href="/">홈</a> / <a href="/clinic/">기관</a> / ${esc(clinic.name)}</div>
<section class="cd-hero">
  <h1>${esc(clinic.name)} 가격 정보</h1>
  <p class="cd-lead">${esc(regionLabel(clinic))} ${esc(typeLabel(clinic))} · 방문 전 전화 확인을 권장합니다.</p>
  <div class="cd-meta">
    <span class="cd-chip">${esc(typeLabel(clinic))}</span>
    <span class="cd-chip">${esc(address)}</span>
    ${phone ? `<span class="cd-chip">${esc(phone)}</span>` : ""}
    ${updatedAt ? `<span class="cd-chip cd-chip-muted">업데이트 ${esc(updatedAt)}</span>` : ""}
    ${parkingText ? `<span class="cd-chip cd-chip-muted">주차 ${esc(parkingText)}</span>` : ""}
  </div>
  <div class="cd-cta-row">
    ${hasMapCta ? `<a class="cd-cta-btn cd-cta-map" href="${esc(mapDeepLink)}">GLP-1 지도에서 보기</a>` : ""}
    ${phone ? `<a class="cd-cta-btn cd-cta-phone" href="tel:${esc(phoneTel(phone))}">전화하기</a>` : ""}
    ${naverUrl ? `<a class="cd-cta-btn cd-cta-naver" href="${esc(naverUrl)}" rel="noopener">네이버 지도</a>` : ""}
  </div>
</section>
${renderTreatmentNav(clinic, catalog)}
<div class="cd-section-head"><h2>표시 가격</h2><span class="cd-small">수집 시점 기준 · 기관 확인 권장</span></div>
${renderAllTreatmentGroups(clinic, catalog)}
${providerNote ? `<div class="cd-section-head"><h2>기관 안내</h2></div><div class="cd-note">${esc(providerNote)}</div>` : ""}
${regionLinks ? `<div class="cd-section-head"><h2>이 지역 가격 더 보기</h2></div><div class="cd-region-links">${regionLinks}</div>` : ""}
<div class="cd-section-head"><h2>확인 안내</h2></div>
<p class="cd-disclaimer">하루센스는 병·의원 광고비와 중개수수료 없이 운영되는 GLP-1 가격정보 지도입니다. 표시 가격은 수집 시점 기준이며, 방문 전 기관에 최종 확인해주세요.</p>`;

  write(`clinic/${slug}/index.html`, pageShell({
    title: `${clinic.name} ${treatmentPart} 가격 | 하루센스`,
    description: `${regionLabel(clinic)} ${clinic.name}의 ${treatmentPart} 가격과 재고 정보를 하루센스에서 확인하세요.`,
    canonicalPath: pathName,
    body,
    jsonLd: [
      breadcrumbJson([{ name: "홈", url: "/" }, { name: "기관", url: "/clinic/" }, { name: clinic.name, url: pathName }]),
      { "@context": "https://schema.org", "@type": typeLabel(clinic) === "약국" ? "Pharmacy" : "MedicalClinic", name: clinic.name, address: clinic.address || undefined, telephone: clinic.phone || undefined, url: canonical(pathName) }
    ]
  }));
  return pathName;
}

function renderClinicHub(clinics, catalog, regionalPaths) {
  const products = seoProducts(catalog);
  const items = clinics.map(clinic => {
    const slug = clinicSlug(clinic);
    const priceChips = products.map(product => {
      const price = lowestProductPrice(clinic, product);
      return price ? `<span class="cd-chip">${esc(product.ko)} ${money(price)}부터</span>` : "";
    }).filter(Boolean).join("");
    return `<a class="card" href="/clinic/${slug}/"><strong>${esc(clinic.name)}</strong><div class="small">${esc(regionLabel(clinic))} · ${esc(typeLabel(clinic))}</div><div class="meta">${priceChips}</div></a>`;
  }).join("\n");
  const regionLinks = regionalPaths.map(p => `<a class="cd-chip cd-chip-primary" href="${p.url}">${esc(p.label)}</a>`).join("\n");
  const body = `<section class="cd-hero"><h1>마운자로·위고비 가격 등록 기관</h1><p class="cd-lead">하루센스 가격지도에 표시되는 병·의원과 약국의 마운자로·위고비 가격정보입니다.</p><div class="cd-meta"><span class="cd-chip cd-chip-primary">기관 상세 ${clinics.length}곳</span><span class="cd-chip cd-chip-primary">지역 가격 ${regionalPaths.length}개</span><span class="cd-chip">광고비 0원</span></div></section><div class="cd-section-head"><h2>지역별 가격 바로가기</h2></div><div class="cd-region-links">${regionLinks}</div><div class="cd-section-head"><h2>기관 목록</h2></div><div class="grid">${items}</div>`;
  write("clinic/index.html", pageShell({ title: "마운자로·위고비 가격 등록 기관 | 하루센스", description: "하루센스에 등록된 병·의원과 약국의 마운자로 가격, 위고비 가격, 재고 정보를 확인하세요.", canonicalPath: "/clinic/", body, jsonLd: [breadcrumbJson([{ name: "홈", url: "/" }, { name: "기관", url: "/clinic/" }])] }));
  return "/clinic/";
}

function renderRegionPage(product, sidoSlug, sigunguSlug, clinics) {
  const sample = clinics[0];
  const sidoName = clinicSidoName(sample);
  const sigunguName = clinicSigunguName(sample);
  const pathName = `/${product.root}/${sidoSlug}/${sigunguSlug}/`;
  const priced = clinics.map(clinic => ({ clinic, price: lowestProductPrice(clinic, product) }))
    .filter(item => item.price)
    .sort((a, b) => a.price - b.price);
  const rows = priced.map(({ clinic, price }) => {
    const phone = clinic.phone || "";
    const phoneCell = phone ? `<a class="cd-cta-btn cd-cta-phone" href="tel:${esc(phoneTel(phone))}">${esc(phone)}</a>` : `<span class="cd-small">확인 필요</span>`;
    return `<tr><td><a href="/clinic/${clinicSlug(clinic)}/"><strong>${esc(clinic.name)}</strong></a><div class="cd-small">${esc(clinic.address || regionLabel(clinic) || "")}</div></td><td class="cd-price">${money(price)}부터</td><td>${phoneCell}</td></tr>`;
  }).join("\n");
  const emptyRow = `<tr><td colspan="3"><span class="cd-small">현재 표시 가능한 가격을 정리 중입니다.</span></td></tr>`;
  const body = `
    <div class="cd-breadcrumbs"><a href="/">홈</a> / <a href="/${product.root}/">${esc(product.ko)}</a> / <a href="/${product.root}/${sidoSlug}/">${esc(sidoName)}</a> / ${esc(sigunguName)}</div>
    <section class="cd-hero">
      <h1>${esc(sigunguName)} ${esc(product.ko)} 가격지도</h1>
      <p class="cd-lead">${esc(sidoName)} ${esc(sigunguName)}에서 확인된 ${esc(product.ko)} 가격을 낮은 가격 순으로 정리했습니다.</p>
      <div class="cd-meta">
        <span class="cd-chip cd-chip-primary">${clinics.length}곳 표시</span>
        <a class="cd-chip cd-chip-action" href="/?drug=${product.product_key}&district=${encodeURIComponent(sigunguName)}">지도에서 보기</a>
        <span class="cd-chip">방문 전 전화 확인 권장</span>
      </div>
    </section>
    <div class="cd-section-head"><h2>${esc(sigunguName)} ${esc(product.ko)} 가격 낮은 순</h2><span class="cd-small">최저 표시 가격 기준</span></div>
    <section class="cd-group is-glp1">
      <div class="cd-group-head"><h3>${esc(product.ko)} 가격 정보</h3><span class="cd-group-badge">지역 가격</span></div>
      <div class="cd-group-body">
        <table class="cd-price-table"><thead><tr><th>기관</th><th>최저 표시 가격</th><th>전화</th></tr></thead><tbody>${rows || emptyRow}</tbody></table>
      </div>
    </section>
    <div class="cd-section-head"><h2>가격 확인 기준</h2></div>
    <section class="cd-group">
      <div class="cd-group-body"><p class="cd-small">병·의원 표시 가격은 진료비와 약제비를 포함한 실제결제 총비용 기준입니다. 약국 표시 가격은 조제비와 약값을 포함한 실제결제 총비용 기준입니다.</p></div>
    </section>`;
  write(`${product.root}/${sidoSlug}/${sigunguSlug}/index.html`, pageShell({ title: `${sigunguName} ${product.ko} 가격지도 | 하루센스`, description: `${sigunguName} ${product.ko} 가격을 지역별로 비교해보세요. 하루센스가 병·의원과 약국의 가격정보를 제공합니다.`, canonicalPath: pathName, body, jsonLd: [breadcrumbJson([{ name: "홈", url: "/" }, { name: product.ko, url: `/${product.root}/` }, { name: sidoName, url: `/${product.root}/${sidoSlug}/` }, { name: sigunguName, url: pathName }])] }));
  return { url: pathName, label: `${sigunguName} ${product.ko} 가격` };
}
function renderSidoHub(product, sidoSlug, regionPages) {
  const sidoName = REGION_NAMES[sidoSlug] || sidoSlug;
  const pathName = `/${product.root}/${sidoSlug}/`;
  const links = regionPages.filter(page => page.productKey === product.product_key && page.sidoSlug === sidoSlug).map(page => `<a class="card" href="${page.url}"><strong>${esc(page.label)}</strong><div class="small">지역별 ${esc(product.ko)} 가격 비교</div></a>`).join("\n");
  if (!links) return null;
  const body = `<section class="hero"><h1>${sidoName} ${esc(product.ko)} 가격지도</h1><p class="lead">${sidoName} 지역의 ${esc(product.ko)} 가격 페이지를 구·시 단위로 확인하세요.</p></section><h2>지역 선택</h2><div class="grid">${links}</div>`;
  write(`${product.root}/${sidoSlug}/index.html`, pageShell({ title: `${sidoName} ${product.ko} 가격지도 | 하루센스`, description: `${sidoName} ${product.ko} 가격을 구·시 단위로 비교해보세요.`, canonicalPath: pathName, body, jsonLd: [breadcrumbJson([{ name: "홈", url: "/" }, { name: product.ko, url: `/${product.root}/` }, { name: sidoName, url: pathName }])] }));
  return pathName;
}

function updateSitemap(paths, catalog) {
  const sitemapPath = path.join(ROOT, "sitemap.xml");
  const outputSitemapPath = path.join(OUT_ROOT, "sitemap.xml");
  let existing = "";
  try { existing = fs.readFileSync(sitemapPath, "utf8"); } catch {}
  const urls = new Set();
  const seoRoots = seoProducts(catalog).map(product => product.root.replace(/\//g, "\\/"));
  const staleItemPattern = seoRoots.length ? new RegExp(`^\\/(?:${seoRoots.join("|")})\\/[^/]+\\/item\\/?$`) : null;
  for (const match of existing.matchAll(/<loc>(.*?)<\/loc>/g)) {
    const url = match[1].trim();
    if (url.startsWith(SITE)) {
      const p = url.replace(SITE, "") || "/";
      if (!staleItemPattern || !staleItemPattern.test(p)) urls.add(p);
    }
  }
  paths.forEach(p => urls.add(p));
  const sorted = Array.from(urls).sort((a, b) => a.localeCompare(b));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sorted.map(p => `  <url><loc>${SITE}${p}</loc><lastmod>${TODAY}</lastmod></url>`).join("\n")}\n</urlset>\n`;
  ensureDir(path.dirname(outputSitemapPath));
  fs.writeFileSync(outputSitemapPath, xml, "utf8");
}

function main() {
  const clinicsFile = process.env.HARUSENSE_CLINICS_FILE || "clinics.json";
  const raw = readJsonFlexible(clinicsFile);
  const catalog = readJson("data/treatments.catalog.json");
  const clinics = (Array.isArray(raw) ? raw : raw.clinics || []).filter(clinic => !isDemo(clinic) && validCoords(clinic) && clinic.name && hasAnyCatalogPrice(clinic, catalog));
  const paths = [];
  const regionPages = [];
  clinics.forEach(clinic => paths.push(renderClinicPage(clinic, catalog)));

  for (const product of seoProducts(catalog)) {
    const groups = new Map();
    clinics.filter(clinic => productHasPrice(clinic, product) && hasUsableRegion(clinic)).forEach(clinic => {
      const parts = regionSlugParts(clinic);
      const key = `${parts.sidoSlug}/${parts.sigunguSlug}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(clinic);
    });
    for (const [key, group] of groups) {
      const [sidoSlug, sigunguSlug] = key.split("/");
      const page = renderRegionPage(product, sidoSlug, sigunguSlug, group);
      regionPages.push({ ...page, productKey: product.product_key, root: product.root, sidoSlug, sigunguSlug });
      paths.push(page.url);
    }
  }

  const sidoProductPairs = new Set(regionPages.map(page => `${page.productKey}|${page.sidoSlug}`));
  const seoProductMap = new Map(seoProducts(catalog).map(product => [product.product_key, product]));
  for (const pair of sidoProductPairs) {
    const [productKey, sidoSlug] = pair.split("|");
    const product = seoProductMap.get(productKey);
    const hub = product ? renderSidoHub(product, sidoSlug, regionPages) : null;
    if (hub) paths.push(hub);
  }
  paths.push(renderClinicHub(clinics, catalog, regionPages));
  updateSitemap(paths, catalog);

  const report = ["# SEO 자동 생성 결과", "", `- 실행일: ${TODAY}`, `- 상세페이지 대상 기관: ${clinics.length}곳`, `- 지역 가격 페이지: ${regionPages.length}개`, `- 시도 허브 페이지: ${sidoProductPairs.size}개`, "- sitemap.xml: 갱신 완료", "", "## 운영 흐름", "", "1. 지도 데이터(clinics.json)에 신규기관 좌표와 가격/재고가 반영됩니다.", "2. 생성기를 실행하면 기관 상세페이지와 지역별 가격페이지가 자동으로 갱신됩니다.", "3. GitHub에는 clinic 폴더, mounjaro 폴더, wegovy 폴더, sitemap.xml을 올리면 됩니다.", "", "## 생성된 지역 페이지", "", ...regionPages.map(page => `- ${page.label}: ${page.url}`)].join("\n");
  ensureDir(path.join(OUT_ROOT, "seo-planning"));
  fs.writeFileSync(path.join(OUT_ROOT, "seo-planning", "SEO_자동생성_실행결과.md"), report, "utf8");
  console.log(JSON.stringify({ ok: true, outputRoot: OUT_ROOT, clinics: clinics.length, regionPages: regionPages.length, hubs: sidoProductPairs.size, paths: paths.length }, null, 2));
}

main();




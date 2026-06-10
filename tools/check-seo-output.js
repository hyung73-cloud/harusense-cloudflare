const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE = "https://harusense.com";
const TARGET_DIRS = ["clinic", "mounjaro", "wegovy"];

function readText(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function readJson(file) {
  return JSON.parse(readText(file));
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const errors = [];
const warnings = [];
function fail(message, details) {
  errors.push({ message, details });
}

const raw = readJson("clinics.json");
const clinics = Array.isArray(raw) ? raw : raw.clinics || [];
const visibleClinics = clinics.filter(clinic => {
  const id = String(clinic.id || "").toLowerCase();
  const name = String(clinic.name || "");
  const hasCoords = Number.isFinite(Number(clinic.lat)) && Number.isFinite(Number(clinic.lng));
  return hasCoords && name && !id.includes("sample") && !id.includes("fallback") && !name.includes("샘플");
});

const missingRegion = visibleClinics.filter(clinic => !clinic.sido_slug || !clinic.sigungu_slug || !clinic.region_key || !clinic.sido || !clinic.sigungu);
if (missingRegion.length) {
  fail("지역 SEO 필드가 비어 있는 기관이 있습니다.", missingRegion.map(c => ({ id: c.id, name: c.name, sido: c.sido, sigungu: c.sigungu, sido_slug: c.sido_slug, sigungu_slug: c.sigungu_slug, region_key: c.region_key })));
}

const suspiciousRegion = visibleClinics.filter(clinic => [clinic.sido, clinic.sigungu, clinic.district].some(value => String(value || "").includes("???")));
if (suspiciousRegion.length) {
  fail("지역명이 ???로 깨진 기관이 있습니다.", suspiciousRegion.map(c => ({ id: c.id, name: c.name, sido: c.sido, sigungu: c.sigungu, district: c.district })));
}

const htmlFiles = TARGET_DIRS.flatMap(dir => walk(path.join(ROOT, dir))).filter(file => file.endsWith(".html"));
const brokenHtml = [];
for (const file of htmlFiles) {
  const text = fs.readFileSync(file, "utf8");
  if (text.includes("???")) brokenHtml.push(path.relative(ROOT, file));
}
if (brokenHtml.length) fail("생성된 SEO 페이지 안에 ??? 문자가 있습니다.", brokenHtml.slice(0, 50));

const sitemapPath = path.join(ROOT, "sitemap.xml");
if (!fs.existsSync(sitemapPath)) {
  fail("sitemap.xml 파일이 없습니다.");
} else {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  if (sitemap.includes("/item/")) fail("sitemap.xml에 /item/ 잘못된 주소가 남아 있습니다.");
  const required = [SITE + "/clinic/", SITE + "/mounjaro/", SITE + "/wegovy/"];
  for (const url of required) {
    if (!sitemap.includes("<loc>" + url + "</loc>")) warnings.push("sitemap.xml에 기본 URL이 없을 수 있습니다: " + url);
  }
}

const report = {
  ok: errors.length === 0,
  clinics: clinics.length,
  visibleClinics: visibleClinics.length,
  htmlFiles: htmlFiles.length,
  errors,
  warnings
};

console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exit(1);

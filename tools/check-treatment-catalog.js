const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const catalogPath = path.join(ROOT, "data", "treatments.catalog.json");
const errors = [];
const warnings = [];

function fail(message, details) { errors.push({ message, details }); }
function warn(message, details) { warnings.push({ message, details }); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")); }

if (!fs.existsSync(catalogPath)) {
  fail("data/treatments.catalog.json 파일이 없습니다.");
} else {
  const catalog = readJson(catalogPath);
  const groups = Array.isArray(catalog.groups) ? catalog.groups : [];
  if (!groups.length) fail("품목 그룹이 비어 있습니다.");

  const groupKeys = new Set();
  const productKeys = new Set();
  const roots = new Set();
  const priceKeys = new Set();

  for (const group of groups) {
    if (!group.group_key) fail("group_key가 없는 그룹이 있습니다.", group);
    if (groupKeys.has(group.group_key)) fail("group_key가 중복됩니다.", group.group_key);
    groupKeys.add(group.group_key);

    if (!group.ko) fail("그룹 한글명이 비어 있습니다.", group.group_key);
    const products = Array.isArray(group.products) ? group.products : [];
    if (!products.length) warn("상품이 없는 그룹입니다.", group.group_key);

    for (const product of products) {
      const id = `${group.group_key}/${product.product_key || ""}`;
      if (!product.product_key) fail("product_key가 없는 품목이 있습니다.", product);
      if (productKeys.has(product.product_key)) fail("product_key가 중복됩니다.", product.product_key);
      productKeys.add(product.product_key);

      if (!product.ko) fail("품목 한글명이 비어 있습니다.", id);
      if (!product.root) fail("품목 root가 비어 있습니다.", id);
      if (product.root && roots.has(product.root)) fail("품목 root가 중복됩니다.", product.root);
      roots.add(product.root);

      if (!product.price_key_prefix) fail("price_key_prefix가 비어 있습니다.", id);
      const variants = Array.isArray(product.variants) ? product.variants : [];
      if (!variants.length) fail("variants가 비어 있습니다.", id);
      for (const variant of variants) {
        const key = `${product.price_key_prefix}_${variant}`;
        if (priceKeys.has(key)) fail("생성될 가격 key가 중복됩니다.", key);
        priceKeys.add(key);
      }

      if (group.seo_enabled && !product.keywords?.length) {
        warn("SEO 활성 그룹인데 keywords가 비어 있습니다.", id);
      }
    }
  }
}

const report = { ok: errors.length === 0, errors, warnings };
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exit(1);


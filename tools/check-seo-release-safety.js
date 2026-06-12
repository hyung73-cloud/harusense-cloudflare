const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT_ROOT = process.argv[2] ? path.resolve(process.argv[2]) : ROOT;
const CONFIG_PATH = path.join(ROOT, "data", "service-profile-allowlist.json");

const BROKEN_PATTERNS = [
  /\?\?\?/,
  /\uFFFD/,
  /媛|援|留|鍮|醫|쨌/
];

function readText(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
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

function relative(file) {
  return path.relative(OUTPUT_ROOT, file).replace(/\\/g, "/");
}

function hasBrokenText(text) {
  return BROKEN_PATTERNS.some(pattern => pattern.test(text));
}

function loadAllowlist() {
  try {
    const config = readJson(CONFIG_PATH);
    const mode = String(config.mode || "allowlist").trim().toLowerCase();
    const list = config.enabled_institution_nos || config.enabled_institutions || [];
    return {
      mode,
      all: mode === "all",
      allowed: new Set(list.map(value => String(value || "").trim()).filter(Boolean))
    };
  } catch {
    return {
      mode: "allowlist",
      all: false,
      allowed: new Set(["12339695"])
    };
  }
}

function clinicInstitutionNoFromHtml(text) {
  const match = text.match(/data-institution-no="([^"]+)"/);
  return match ? String(match[1]).trim() : "";
}

function checkBrokenText() {
  const roots = ["clinic", "mounjaro", "wegovy", "seo-planning"];
  const targets = roots.flatMap(name => walk(path.join(OUTPUT_ROOT, name)));
  if (fs.existsSync(path.join(OUTPUT_ROOT, "sitemap.xml"))) {
    targets.push(path.join(OUTPUT_ROOT, "sitemap.xml"));
  }

  const broken = [];
  for (const file of targets) {
    if (!/\.(html|xml|md)$/i.test(file)) continue;
    const text = readText(file);
    if (hasBrokenText(text)) broken.push(relative(file));
  }
  return broken;
}

function checkServiceAllowlist() {
  const allowlist = loadAllowlist();
  const clinicFiles = walk(path.join(OUTPUT_ROOT, "clinic")).filter(file => file.endsWith("index.html"));
  const servicePages = [];
  const unexpected = [];
  const missing = [];

  for (const file of clinicFiles) {
    const text = readText(file);
    if (!text.includes("cd-live-service-section")) continue;
    const institutionNo = clinicInstitutionNoFromHtml(text);
    servicePages.push({ file: relative(file), institutionNo });
    if (!allowlist.all && !allowlist.allowed.has(institutionNo)) {
      unexpected.push({ file: relative(file), institutionNo });
    }
  }

  if (!allowlist.all) {
    for (const institutionNo of allowlist.allowed) {
      if (!servicePages.some(page => page.institutionNo === institutionNo)) missing.push(institutionNo);
    }
  }

  return { mode: allowlist.mode, servicePages, unexpected, missing };
}

function checkSitemap() {
  const sitemap = path.join(OUTPUT_ROOT, "sitemap.xml");
  if (!fs.existsSync(sitemap)) return { exists: false, urls: 0, broken: true };
  const text = readText(sitemap);
  const urls = (text.match(/<loc>/g) || []).length;
  return { exists: true, urls, broken: hasBrokenText(text) };
}

function main() {
  const brokenFiles = checkBrokenText();
  const service = checkServiceAllowlist();
  const sitemap = checkSitemap();
  const ok = brokenFiles.length === 0 && service.unexpected.length === 0 && service.missing.length === 0 && sitemap.exists && !sitemap.broken;

  const result = {
    ok,
    outputRoot: OUTPUT_ROOT,
    brokenTextFiles: brokenFiles,
    serviceProfile: service,
    sitemap
  };

  console.log(JSON.stringify(result, null, 2));

  if (!ok) process.exit(1);
}

main();

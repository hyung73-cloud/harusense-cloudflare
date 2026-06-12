#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const targetDir = path.resolve(process.argv[2] || ".");

const requiredTopLevel = [
  "clinic",
  "mounjaro",
  "wegovy",
  "sitemap.xml",
  "seo-planning",
  "data",
  "tools",
  "MANIFEST.json",
  "RELEASE_REPORT_check-result.txt",
  "POST_UPLOAD_CHECKLIST.txt",
  "SERVICE_EXPANSION_GUIDE.md",
  "SERVICE_PROFILE_ROLLOUT.md",
  "SEO_RELEASE_ROLLBACK.md",
  "VERIFY_LINKS.html",
  "UPLOAD_README.txt",
];

const forbiddenTopLevel = [
  "index.html",
  "clinics.json",
  "functions",
];

const requiredFiles = [
  "data/treatments.catalog.json",
  "tools/build-seo-upload-package.js",
  "tools/generate-seo-pages.js",
  "tools/check-seo-release-safety.js",
  "tools/check-service-catalog-sync.js",
  "tools/check-service-profile-output.js",
  "tools/check-upload-package.js",
  "SERVICE_EXPANSION_GUIDE.md",
  "SERVICE_PROFILE_ROLLOUT.md",
  "SEO_RELEASE_ROLLBACK.md",
  "clinic/12339695-newsense/index.html",
  "mounjaro/seoul/mapo/index.html",
  "wegovy/seoul/mapo/index.html",
];

main();

function main() {
  const errors = [];
  const warnings = [];

  if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    fail(`Upload package folder not found: ${targetDir}`);
  }

  for (const item of requiredTopLevel) {
    if (!fs.existsSync(path.join(targetDir, item))) {
      errors.push(`Missing top-level item: ${item}`);
    }
  }

  for (const item of forbiddenTopLevel) {
    if (fs.existsSync(path.join(targetDir, item))) {
      errors.push(`Forbidden top-level item included: ${item}`);
    }
  }

  for (const item of requiredFiles) {
    if (!fs.existsSync(path.join(targetDir, item))) {
      errors.push(`Missing required file: ${item}`);
    }
  }

  const manifestPath = path.join(targetDir, "MANIFEST.json");
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      if (manifest?.safety?.mainMapIncluded !== false) {
        errors.push("MANIFEST safety.mainMapIncluded is not false.");
      }
      if (manifest?.safety?.loginIncluded !== false) {
        errors.push("MANIFEST safety.loginIncluded is not false.");
      }
      if (manifest?.safety?.appsScriptIncluded !== false) {
        errors.push("MANIFEST safety.appsScriptIncluded is not false.");
      }
    } catch (err) {
      errors.push(`MANIFEST.json is not valid JSON: ${err.message}`);
    }
  }

  const newsensePage = readIfExists(path.join(targetDir, "clinic/12339695-newsense/index.html"));
  if (newsensePage && !newsensePage.includes("추가 진료 항목")) {
    warnings.push("Newsense page does not include the pilot additional service section text.");
  }

  const sitemap = readIfExists(path.join(targetDir, "sitemap.xml"));
  if (sitemap && !sitemap.includes("https://harusense.com/clinic/12339695-newsense/")) {
    errors.push("sitemap.xml does not include Newsense clinic detail URL.");
  }

  const result = {
    ok: errors.length === 0,
    targetDir,
    errors,
    warnings,
    checkedAt: new Date().toISOString(),
  };

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function fail(message) {
  console.error(JSON.stringify({ ok: false, error: message }, null, 2));
  process.exit(1);
}

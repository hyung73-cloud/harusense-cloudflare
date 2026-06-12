#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const CODEX_ROOT = path.resolve(ROOT, "..");
const stamp = makeStamp();
const buildDir = path.join(CODEX_ROOT, `harusense_SEO_BUILD_${stamp}`);
const uploadDir = path.join(CODEX_ROOT, `harusense_UPLOAD_ONLY_seo_release_${stamp}`);

const generatedItems = [
  "clinic",
  "mounjaro",
  "wegovy",
  "sitemap.xml",
  "seo-planning",
];

const sourceItems = [
  "RUN_SEO_UPLOAD_PACKAGE.bat",
  "SEO_UPLOAD_OPERATING_NOTE.md",
  "SEO_업로드묶음_만들기.bat",
  "SEO_업로드_운영메모.md",
  "tools/build-seo-upload-package.js",
  "tools/generate-seo-pages.js",
  "tools/check-seo-release-safety.js",
  "tools/check-service-catalog-sync.js",
  "tools/check-service-profile-output.js",
  "tools/check-upload-package.js",
  "data/treatments.catalog.json",
];

const report = {
  stamp,
  buildDir,
  uploadDir,
  steps: [],
};

main();

function main() {
  assertCleanTarget(buildDir);
  assertCleanTarget(uploadDir);
  fs.mkdirSync(buildDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });

  runStep("Generate SEO pages", "tools/generate-seo-pages.js", [], {
    HARUSENSE_SEO_OUTPUT_ROOT: buildDir,
  });
  runStep("Check service catalog sync", "tools/check-service-catalog-sync.js");
  runStep("Check Newsense-only service profile", "tools/check-service-profile-output.js", [buildDir]);
  runStep("Check SEO release safety", "tools/check-seo-release-safety.js", [buildDir]);

  for (const item of generatedItems) {
    copyItem(path.join(buildDir, item), path.join(uploadDir, item));
  }

  for (const item of sourceItems) {
    copyItem(path.join(ROOT, item), path.join(uploadDir, item));
  }

  writeUploadGuide();
  writePostUploadChecklist();
  writeManifest();
  writeVerifyLinks();
  writeReleaseReport();
  runStep("Check upload package completeness", "tools/check-upload-package.js", [uploadDir]);
  writeReleaseReport();

  console.log(JSON.stringify({
    ok: true,
    buildDir,
    uploadDir,
    uploadItems: [
      ...generatedItems,
      ...sourceItems,
      "MANIFEST.json",
      "RELEASE_REPORT_check-result.txt",
      "POST_UPLOAD_CHECKLIST.txt",
      "VERIFY_LINKS.html",
      "UPLOAD_README.txt",
    ],
    note: "Upload only this folder to GitHub root. Main map, login, API, QR, Apps Script are not included.",
  }, null, 2));
}

function runStep(label, scriptRelativePath, args = [], extraEnv = {}) {
  const scriptPath = path.join(ROOT, scriptRelativePath);
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`${label} failed: missing file ${scriptPath}`);
  }

  const startedAt = new Date();
  try {
    const output = execFileSync(process.execPath, [scriptPath, ...args], {
      cwd: ROOT,
      env: { ...process.env, ...extraEnv },
      stdio: "pipe",
      windowsHide: true,
      encoding: "utf8",
    });
    report.steps.push({
      label,
      ok: true,
      durationMs: new Date() - startedAt,
      output: String(output || "").trim(),
    });
  } catch (err) {
    report.steps.push({
      label,
      ok: false,
      durationMs: new Date() - startedAt,
      output: String((err.stdout || err.stderr || err.message || "")).trim(),
    });
    throw err;
  }
}

function copyItem(from, to) {
  if (!fs.existsSync(from)) {
    throw new Error(`Copy failed: missing source ${from}`);
  }

  fs.mkdirSync(path.dirname(to), { recursive: true });
  const stat = fs.statSync(from);
  if (stat.isDirectory()) {
    fs.cpSync(from, to, { recursive: true });
  } else {
    fs.copyFileSync(from, to);
  }
}

function writeUploadGuide() {
  const guidePath = path.join(uploadDir, "UPLOAD_README.txt");
  const lines = [
    "Harusense SEO upload package",
    "",
    "Upload these items to the GitHub repository root:",
    "- clinic/",
    "- mounjaro/",
    "- wegovy/",
    "- sitemap.xml",
    "- seo-planning/",
    "- tools/generate-seo-pages.js",
    "- tools/check-seo-release-safety.js",
    "- tools/check-service-catalog-sync.js",
    "- tools/check-service-profile-output.js",
    "- data/treatments.catalog.json",
    "",
    "Not included in this package:",
    "- index.html",
    "- en/index.html",
    "- clinics.json",
    "- functions/api/",
    "- Apps Script",
    "",
    "This package updates SEO/detail pages only. It does not change the main map, login, QR, or price save logic.",
    "",
    "After upload, open VERIFY_LINKS.html in this folder and use the links there.",
    "",
  ];
  fs.writeFileSync(guidePath, lines.join("\r\n"), "utf8");
}

function writePostUploadChecklist() {
  const target = path.join(uploadDir, "POST_UPLOAD_CHECKLIST.txt");
  const lines = [
    "Harusense post-upload checklist",
    "",
    "1. Upload this package to the GitHub repository root.",
    "   Upload folder:",
    `   ${uploadDir}`,
    "",
    "2. Wait until Cloudflare Pages deployment shows success.",
    "",
    "3. Open these live URLs and check the pages:",
    "   https://harusense.com/clinic/12339695-newsense/",
    "   https://harusense.com/mounjaro/seoul/mapo/",
    "   https://harusense.com/wegovy/seoul/mapo/",
    "   https://harusense.com/mounjaro/seoul/gangseo/",
    "   https://harusense.com/mounjaro/gyeonggi/goyang/",
    "   https://harusense.com/sitemap.xml",
    "",
    "4. Search Console indexing request priority:",
    "   https://harusense.com/sitemap.xml",
    "   https://harusense.com/clinic/12339695-newsense/",
    "   https://harusense.com/mounjaro/seoul/mapo/",
    "   https://harusense.com/wegovy/seoul/mapo/",
    "   https://harusense.com/mounjaro/seoul/gangseo/",
    "   https://harusense.com/mounjaro/gyeonggi/goyang/",
    "",
    "5. Safety scope for this release:",
    "   - Main map is not included.",
    "   - Login and QR API are not included.",
    "   - clinics.json is not included.",
    "   - Apps Script is not included.",
    "   - Additional service sections are visible only on Newsense clinic detail page.",
    "",
    "6. If something looks wrong:",
    "   Do not edit the live main map. Stop and report the exact URL and screenshot.",
    "",
  ];
  fs.writeFileSync(target, lines.join("\r\n"), "utf8");
}

function writeReleaseReport() {
  const reportPath = path.join(uploadDir, "RELEASE_REPORT_check-result.txt");
  const lines = [
    "Harusense SEO release check result",
    "",
    `Created at: ${new Date().toISOString()}`,
    `Work root: ${ROOT}`,
    `Build folder: ${buildDir}`,
    `Upload folder: ${uploadDir}`,
    "",
    "Checks:",
    ...report.steps.map((step, index) => [
      `${index + 1}. ${step.label}: ${step.ok ? "PASS" : "FAIL"} (${step.durationMs}ms)`,
      step.output ? indent(step.output) : "   No output",
    ].join("\r\n")),
    "",
    "Public scope:",
    "- Additional service sections are shown only on Newsense clinic detail page.",
    "- Other clinic detail pages must not show additional service sections yet.",
    "",
    "This package does not include main map, login, QR, API, or Apps Script files.",
  ];
  fs.writeFileSync(reportPath, lines.join("\r\n"), "utf8");
}

function writeManifest() {
  const manifestPath = path.join(uploadDir, "MANIFEST.json");
  const manifest = {
    createdAt: new Date().toISOString(),
    uploadDir,
    buildDir,
    purpose: "SEO/detail-page upload package only",
    excludedByDesign: [
      "index.html",
      "en/index.html",
      "clinics.json",
      "functions/api/",
      "Apps Script",
    ],
    topLevelItems: fs.readdirSync(uploadDir).sort().map((name) => summarizeItem(path.join(uploadDir, name), name)),
    safety: {
      mainMapIncluded: false,
      loginIncluded: false,
      qrApiIncluded: false,
      appsScriptIncluded: false,
      additionalServicesScope: "Newsense only allowlist",
    },
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
}

function writeVerifyLinks() {
  const verifyPath = path.join(uploadDir, "VERIFY_LINKS.html");
  const links = [
    ["Newsense clinic detail", "https://harusense.com/clinic/12339695-newsense/"],
    ["Mounjaro Mapo SEO page", "https://harusense.com/mounjaro/seoul/mapo/"],
    ["Wegovy Mapo SEO page", "https://harusense.com/wegovy/seoul/mapo/"],
    ["Mounjaro Gangseo SEO page", "https://harusense.com/mounjaro/seoul/gangseo/"],
    ["Mounjaro Goyang SEO page", "https://harusense.com/mounjaro/gyeonggi/goyang/"],
    ["Sitemap", "https://harusense.com/sitemap.xml"],
  ];

  const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Harusense SEO Verify Links</title>
  <style>
    body { font-family: Arial, "Apple SD Gothic Neo", sans-serif; margin: 32px; color: #111827; background: #f8fafc; }
    main { max-width: 760px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 28px; }
    h1 { font-size: 24px; margin: 0 0 8px; }
    p { color: #4b5563; line-height: 1.6; }
    a { display: block; padding: 14px 16px; margin: 10px 0; border: 1px solid #dbe3ef; border-radius: 12px; color: #1d4ed8; text-decoration: none; background: #f9fbff; font-weight: 700; }
    a:hover { background: #eef4ff; }
    .note { margin-top: 22px; padding: 14px 16px; background: #ecfdf5; border: 1px solid #bbf7d0; border-radius: 12px; color: #166534; }
  </style>
</head>
<body>
  <main>
    <h1>Harusense SEO upload verify links</h1>
    <p>GitHub upload and Cloudflare deployment are complete, open these links one by one.</p>
    ${links.map(([label, href]) => `<a href="${href}" target="_blank" rel="noopener">${escapeHtml(label)}<br><small>${href}</small></a>`).join("\n    ")}
    <div class="note">This package is SEO/detail-page only. Main map, login, QR, API, and Apps Script are not included.</div>
  </main>
</body>
</html>`;
  fs.writeFileSync(verifyPath, html, "utf8");
}

function assertCleanTarget(targetPath) {
  if (!targetPath.startsWith(CODEX_ROOT + path.sep)) {
    throw new Error(`Unsafe target path: ${targetPath}`);
  }
  if (fs.existsSync(targetPath)) {
    throw new Error(`Target folder already exists; refusing to overwrite: ${targetPath}`);
  }
}

function makeStamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
}

function indent(text) {
  return String(text)
    .split(/\r?\n/)
    .map((line) => `   ${line}`)
    .join("\r\n");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function summarizeItem(itemPath, relativeName) {
  const stat = fs.statSync(itemPath);
  if (stat.isDirectory()) {
    const files = listFiles(itemPath);
    return {
      name: relativeName,
      type: "directory",
      fileCount: files.length,
      totalBytes: files.reduce((sum, filePath) => sum + fs.statSync(filePath).size, 0),
    };
  }

  return {
    name: relativeName,
    type: "file",
    bytes: stat.size,
    sha256: sha256File(itemPath),
  };
}

function listFiles(dirPath) {
  const out = [];
  for (const name of fs.readdirSync(dirPath)) {
    const next = path.join(dirPath, name);
    const stat = fs.statSync(next);
    if (stat.isDirectory()) {
      out.push(...listFiles(next));
    } else {
      out.push(next);
    }
  }
  return out;
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "_UPLOAD_PROVIDER_SEO_PAGES");
const ITEMS = ["clinic", "mounjaro", "wegovy", "sitemap.xml"];

function removeUploadFolderSafely(target) {
  const base = path.basename(target);
  if (!base.startsWith("_UPLOAD_PROVIDER_SEO_PAGES")) {
    throw new Error("Refusing to remove unexpected folder: " + target);
  }
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}
function copyRecursive(src, dst) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dst, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
}
function main() {
  removeUploadFolderSafely(OUT);
  fs.mkdirSync(OUT, { recursive: true });

  const copied = [];
  const missing = [];
  for (const item of ITEMS) {
    const src = path.join(ROOT, item);
    const dst = path.join(OUT, item);
    if (!fs.existsSync(src)) {
      missing.push(item);
      continue;
    }
    copyRecursive(src, dst);
    copied.push(item);
  }

  const guide = [
    "# 업로드 안내",
    "",
    "이 폴더 안의 항목만 GitHub 루트에 올리면 됩니다.",
    "",
    "올릴 항목:",
    ...copied.map(item => "- " + item),
    "",
    "주의:",
    "- index.html, clinics.json, functions/api는 이번 작업에서 올리지 않습니다.",
    "- 관계자 수정값을 반영한 SEO 페이지와 sitemap.xml만 올립니다.",
    "- 업로드 후 확인 주소 예: https://harusense.com/clinic/12339695-newsense/",
    ""
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "UPLOAD_이것만_올리세요.md"), guide, "utf8");

  console.log(JSON.stringify({ ok: true, outputFolder: OUT, copied, missing }, null, 2));
}

main();

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SERVICE_KEY_RE = /\b(?:iv|botox|vaccine)_[a-z0-9_]+\b/g;

const TARGETS = [
  "index.html",
  "en/index.html",
  "tools/generate-seo-pages.js",
  "data/treatments.catalog.json"
];

function readKeys(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  const text = fs.readFileSync(filePath, "utf8");
  return [...new Set(text.match(SERVICE_KEY_RE) || [])].sort();
}

function diff(left, right) {
  return left.filter(key => !right.includes(key));
}

const keysByFile = Object.fromEntries(TARGETS.map(file => [file, readKeys(file)]));
const referenceFile = "data/treatments.catalog.json";
const referenceKeys = keysByFile[referenceFile];

const mismatches = TARGETS
  .filter(file => file !== referenceFile)
  .map(file => ({
    file,
    missingFromFile: diff(referenceKeys, keysByFile[file]),
    extraInFile: diff(keysByFile[file], referenceKeys)
  }))
  .filter(item => item.missingFromFile.length || item.extraInFile.length);

const report = {
  ok: mismatches.length === 0,
  referenceFile,
  serviceKeyCount: referenceKeys.length,
  files: Object.fromEntries(TARGETS.map(file => [file, keysByFile[file].length])),
  mismatches
};

console.log(JSON.stringify(report, null, 2));

if (!report.ok) process.exit(1);

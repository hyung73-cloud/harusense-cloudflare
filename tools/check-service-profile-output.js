const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT_ROOT = process.argv[2] ? path.resolve(process.argv[2]) : ROOT;
const CONFIG_PATH = path.join(ROOT, "data", "service-profile-allowlist.json");
const CLINIC_ROOT = path.join(OUTPUT_ROOT, "clinic");
const SERVICE_MARKER = "cd-live-service-section";

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function walkIndexFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkIndexFiles(full));
    else if (entry.isFile() && entry.name === "index.html") out.push(full);
  }
  return out;
}

function normalizeNo(value) {
  return String(value || "").trim();
}

function institutionNoFromFile(file) {
  const html = fs.readFileSync(file, "utf8");
  const match = html.match(/data-institution-no="([^"]+)"/);
  return match ? normalizeNo(match[1]) : "";
}

function main() {
  const config = readJson(CONFIG_PATH);
  const mode = String(config.mode || "allowlist").trim().toLowerCase();
  const allowed = new Set((config.enabled_institution_nos || config.enabled_institutions || []).map(normalizeNo).filter(Boolean));
  const files = walkIndexFiles(CLINIC_ROOT);
  const serviceFiles = files.filter(file => fs.readFileSync(file, "utf8").includes(SERVICE_MARKER));
  const serviceNos = serviceFiles.map(file => ({ file, institutionNo: institutionNoFromFile(file) }));

  const unexpected = mode === "all"
    ? []
    : serviceNos.filter(item => !allowed.has(item.institutionNo));

  const missing = mode === "all"
    ? []
    : [...allowed].filter(no => !serviceNos.some(item => item.institutionNo === no));

  const result = {
    ok: unexpected.length === 0 && missing.length === 0,
    mode,
    outputRoot: OUTPUT_ROOT,
    totalClinicPages: files.length,
    serviceProfilePages: serviceFiles.length,
    allowedInstitutionNos: [...allowed],
    serviceInstitutionNos: serviceNos.map(item => item.institutionNo),
    unexpectedInstitutionNos: unexpected.map(item => item.institutionNo),
    missingInstitutionNos: missing
  };

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

main();

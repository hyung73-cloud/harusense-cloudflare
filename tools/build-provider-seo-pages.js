#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_API_URL = "https://harusense.com/api/account?action=getClinicOverrides";

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}
function hasArg(name) {
  return process.argv.includes(name);
}
function writeText(file, text) {
  const target = path.isAbsolute(file) ? file : path.join(ROOT, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text, "utf8");
  return target;
}
function runNode(args, options = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    env: { ...process.env, ...(options.env || {}) },
    stdio: "inherit"
  });
  if (result.status !== 0) {
    throw new Error(`${args.join(" ")} failed with exit code ${result.status}`);
  }
}
async function fetchUpdates(url, outputFile) {
  const response = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!response.ok) throw new Error(`Failed to fetch provider updates: ${response.status} ${response.statusText}`);
  const json = await response.text();
  const target = writeText(outputFile, json.endsWith("\n") ? json : json + "\n");
  return target;
}
async function main() {
  const updatesFile = argValue("--updates", "data/provider-updates.latest.json");
  const mergedClinicsFile = argValue("--merged", "clinics.with-provider-updates.json");
  const url = argValue("--url", DEFAULT_API_URL);
  const shouldFetch = hasArg("--fetch") || hasArg("--url");

  let actualUpdatesFile = updatesFile;
  if (shouldFetch) {
    actualUpdatesFile = await fetchUpdates(url, updatesFile);
  } else {
    const target = path.isAbsolute(updatesFile) ? updatesFile : path.join(ROOT, updatesFile);
    if (!fs.existsSync(target)) {
      throw new Error(`Provider updates file not found: ${target}\nUse --fetch to download from harusense.com, or save JSON to data/provider-updates.latest.json.`);
    }
  }

  runNode([
    "tools/apply-provider-updates-to-clinics.js",
    "--updates", actualUpdatesFile,
    "--out", mergedClinicsFile
  ]);

  runNode(["tools/generate-seo-pages.js"], {
    env: { HARUSENSE_CLINICS_FILE: mergedClinicsFile }
  });

  if (fs.existsSync(path.join(ROOT, "tools/check-seo-output.js"))) {
    runNode(["tools/check-seo-output.js"]);
  }

  console.log(JSON.stringify({
    ok: true,
    updatesFile: actualUpdatesFile,
    mergedClinicsFile,
    generated: ["clinic/", "mounjaro/", "wegovy/", "sitemap.xml"]
  }, null, 2));
}

main().catch(err => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});

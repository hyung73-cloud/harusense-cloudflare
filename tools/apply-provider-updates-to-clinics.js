#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function stripBom(text) { return String(text || "").replace(/^\uFEFF/, ""); }
function readJson(file) {
  const target = path.isAbsolute(file) ? file : path.join(ROOT, file);
  return JSON.parse(stripBom(fs.readFileSync(target, "utf8")));
}
function writeJson(file, data) {
  const target = path.isAbsolute(file) ? file : path.join(ROOT, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(data, null, 2) + "\n", "utf8");
}
function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}
function asArrayPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.updates)) return payload.updates;
  throw new Error("Provider update JSON must be an array or { updates: [...] }.");
}
function clinicInstitutionNo(clinic) {
  return String(clinic.institution_no || clinic.institutionNo || "").trim();
}
function normalizeItem(value) {
  if (value && typeof value === "object" && ("price" in value || "in_stock" in value)) {
    return {
      price: value.price === "" || value.price == null ? "" : Number(value.price),
      in_stock: value.in_stock !== false
    };
  }
  return {
    price: value === "" || value == null ? "" : Number(value),
    in_stock: true
  };
}
function mergeUpdateIntoClinic(clinic, update) {
  const items = update.items || update.prices || {};
  clinic.prices = clinic.prices && typeof clinic.prices === "object" ? clinic.prices : {};
  clinic.stock = clinic.stock && typeof clinic.stock === "object" ? clinic.stock : {};
  clinic.price_updated_at = clinic.price_updated_at && typeof clinic.price_updated_at === "object" ? clinic.price_updated_at : {};

  const updatedKeys = [];
  Object.entries(items).forEach(([key, rawValue]) => {
    if (!key) return;
    const item = normalizeItem(rawValue);
    const hasPrice = Number.isFinite(Number(item.price)) && Number(item.price) > 0;
    if (hasPrice) {
      clinic.prices[key] = Number(item.price);
    } else {
      delete clinic.prices[key];
    }
    clinic.stock[key] = item.in_stock !== false;
    if (update.updated_at) clinic.price_updated_at[key] = update.updated_at;
    updatedKeys.push(key);
  });

  const providerNote = String(update.provider_note || update.note || "").trim();
  if (providerNote) {
    clinic.provider_note = providerNote;
    clinic.notes = providerNote;
  }

  const parking = String(update.parking_available || update.provider_parking || "").trim();
  if (parking) {
    clinic.provider_parking = parking;
    clinic.parking_available = parking;
  }
  if (update.parking_updated_at) clinic.parking_updated_at = update.parking_updated_at;
  if (update.updated_at) clinic.updated_at = update.updated_at;
  clinic.provider_updated = true;

  return updatedKeys;
}

function main() {
  const clinicsFile = argValue("--clinics", "clinics.json");
  const updatesFile = argValue("--updates", "data/provider-updates.json");
  const outputFile = argValue("--out", process.argv.includes("--write") ? clinicsFile : "clinics.with-provider-updates.json");

  const rawClinics = readJson(clinicsFile);
  const updates = asArrayPayload(readJson(updatesFile));
  const clinicList = Array.isArray(rawClinics) ? rawClinics : rawClinics.clinics || [];
  const byInstitutionNo = new Map();
  clinicList.forEach(clinic => {
    const no = clinicInstitutionNo(clinic);
    if (no) byInstitutionNo.set(no, clinic);
  });

  const unmatched = [];
  let matched = 0;
  const updatedPriceKeys = new Set();

  updates.forEach(update => {
    const institutionNo = String(update.institution_no || update.institutionNo || "").trim();
    if (!institutionNo) return;
    const clinic = byInstitutionNo.get(institutionNo);
    if (!clinic) {
      unmatched.push({ institution_no: institutionNo, reason: "clinics.json has no matching institution_no." });
      return;
    }
    matched += 1;
    mergeUpdateIntoClinic(clinic, update).forEach(key => updatedPriceKeys.add(key));
  });

  const output = Array.isArray(rawClinics)
    ? clinicList
    : { ...rawClinics, clinics: clinicList, last_updated: new Date().toISOString() };
  writeJson(outputFile, output);

  console.log(JSON.stringify({
    ok: true,
    clinicsFile,
    updatesFile,
    outputFile,
    matched,
    unmatched,
    updatedPriceKeys: Array.from(updatedPriceKeys).sort()
  }, null, 2));
}

main();

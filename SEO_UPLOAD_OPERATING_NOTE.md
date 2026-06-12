# Harusense SEO Upload Operating Note

## Purpose

This workflow updates SEO and detail pages only.

It does not change:

- `index.html`
- `en/index.html`
- `clinics.json`
- `functions/api/`
- Apps Script

So the main map, login, QR, and price-save behavior remain untouched.

## How To Run

Double-click:

`RUN_SEO_UPLOAD_PACKAGE.bat`

It creates a folder like:

`C:\Users\user\Documents\Codex\harusense_UPLOAD_ONLY_seo_release_YYYYMMDD-HHMMSS`

Upload only that generated folder's contents to the GitHub repository root.

## What The Package Contains

- `clinic/`
- `mounjaro/`
- `wegovy/`
- `sitemap.xml`
- `seo-planning/`
- `data/treatments.catalog.json`
- `tools/`
- `MANIFEST.json`
- `RELEASE_REPORT_check-result.txt`
- `VERIFY_LINKS.html`
- `UPLOAD_README.txt`

## Current Public Scope

Additional service sections are still Newsense-only pilot content.

Do not open them to all institutions until the pilot is approved.

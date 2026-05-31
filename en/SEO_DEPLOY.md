# English SEO pages — deploy checklist

## Folder structure (upload all to hosting root)

```
harusense.com/              → index.html (Korean map)
harusense.com/en/           → index.html (English map, forced EN)
harusense.com/en/wegovy-map/   → index.html (SEO landing)
harusense.com/en/mounjaro-map/ → index.html (SEO landing)
harusense.com/en/guide/     → index.html (English guide)
harusense.com/guide/        → index.html (Korean guide)
harusense.com/clinics.json  → shared data (root only)
```

## Why separate URLs (not toggle only)?

- Google indexes **URLs**, not UI language toggles.
- `hreflang` pairs Korean `/` with English `/en/`.
- Landing pages target long-tail queries (`wegovy price korea`) without duplicating the full app 3×.

## Target keywords

| URL | Primary queries |
|-----|----------------|
| `/en/` | GLP-1 korea, mounjaro wegovy price map |
| `/en/wegovy-map/` | wegovy korea, wegovy clinic korea, wegovy price korea |
| `/en/mounjaro-map/` | mounjaro korea, mounjaro price korea |
| `/en/guide/` | wegovy price korea guide, treatment & lifestyle (EN) |

## After upload

1. Submit sitemap in Google Search Console
2. Request indexing for `/en/`, `/en/wegovy-map/`, `/en/mounjaro-map/`, `/en/guide/`
3. Korean `/guide/` links to English map and guide (done)

## Cloudflare

- No special rule needed if each folder has `index.html`
- Optional: redirect `harusense.com/en` → `harusense.com/en/` (trailing slash)

## Optional next steps

- Blog posts or city-specific EN landings (e.g. Gangnam) if needed later

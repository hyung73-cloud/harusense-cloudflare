@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ========================================
echo Harusense SEO upload package builder
echo ========================================
echo.
echo This does NOT change main map, login, QR, Apps Script.
echo It only builds SEO pages and an upload-only folder.
echo.

node tools\build-seo-upload-package.js

echo.
echo Done.
echo Upload the folder shown above: harusense_UPLOAD_ONLY_seo_release_*
echo.
pause

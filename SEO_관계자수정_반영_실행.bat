@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo [하루센스] 관계자 수정값을 SEO 페이지에 반영합니다.
echo.
echo 1) Cloudflare에서 관계자 수정값을 가져옵니다.
echo 2) 기관 상세페이지와 지역 가격페이지를 다시 만듭니다.
echo 3) 업로드할 파일만 _UPLOAD_PROVIDER_SEO_PAGES 폴더에 모읍니다.
echo.
node tools\build-provider-seo-pages.js --fetch
if errorlevel 1 (
  echo.
  echo 실패했습니다. 위 오류 내용을 Codex에 보여주세요.
  pause
  exit /b 1
)
node tools\prepare-provider-seo-upload.js
if errorlevel 1 (
  echo.
  echo 업로드 폴더 만들기에 실패했습니다. 위 오류 내용을 Codex에 보여주세요.
  pause
  exit /b 1
)
echo.
echo 완료되었습니다.
echo _UPLOAD_PROVIDER_SEO_PAGES 폴더 안의 항목만 GitHub에 올리세요.
echo.
pause

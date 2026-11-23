@echo off
setlocal
pushd "%~dp0" || (
  echo No se pudo abrir la carpeta de SenaVerse.
  pause
  exit /b 1
)
where node.exe >nul 2>&1
if errorlevel 1 (
  echo Instala Node.js 22 o posterior y abre este archivo de nuevo.
  popd
  pause
  exit /b 1
)
node.exe -e "process.exit(Number(process.versions.node.split('.')[0]) >= 22 ? 0 : 1)"
if errorlevel 1 (
  echo Se requiere Node.js 22 o posterior.
  popd
  pause
  exit /b 1
)
if not exist "scripts\servidor-feria.mjs" (
  echo Falta scripts\servidor-feria.mjs. Extrae el paquete completo antes de iniciar.
  popd
  pause
  exit /b 1
)
node.exe "scripts\servidor-feria.mjs" %*
set "SENAVERSE_EXIT=%ERRORLEVEL%"
popd
if not "%SENAVERSE_EXIT%"=="0" pause
exit /b %SENAVERSE_EXIT%

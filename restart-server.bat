@echo off
echo Stopping all Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo Cleaning dist folder...
if exist dist rmdir /s /q dist

echo Building the project...
call npm run build

echo Starting the server...
call npm run start:dev






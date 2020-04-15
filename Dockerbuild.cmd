@echo off
REM Build 5G-MEDIA vSpeech Speech to Text Service

:vspeech
SET IMG_DIR=C:\Users\igor\Repositories\GITHUB\5gmedia-vspeech
SET IMG_NAME=vspeech
SET IMG_ATT=-p 1935:1935 -p 3000:3000

GOTO :build

:build
echo %IMG_DIR%
cd %IMG_DIR%
echo stop and rm %IMG_NAME%
docker stop %IMG_NAME%
docker rm %IMG_NAME%
REM echo image prune -a
REM docker image prune -a
echo rmi %IMG_NAME%
docker rmi %IMG_NAME%
echo build -t %IMG_NAME% .
docker build -t %IMG_NAME% .
echo run --name %IMG_NAME% %IMG_ATT% -d %IMG_NAME%
docker run --name %IMG_NAME% %IMG_ATT% -d %IMG_NAME%
docker save -o %IMG_DIR%\%IMG_NAME%.tar %IMG_NAME%
REM docker load -i %IMG_DIR%\%IMG_NAME%.tar

IF %IMG_NAME%==vspeech GOTO :EOF
ELSE GOTO :vspeech
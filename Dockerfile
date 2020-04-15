#
# vSpeech Dockerfile
#
# Author: Igor Fritzsch
# Created 18.11.2019

# docker rmi -f vspeech
# docker build -t vspeech .
# docker run --name vspeech -p 8885:8885 --rm vspeech
# docker run --name vspeech -e DEBUG=true -p 8885:8885 --rm vspeech

FROM ubuntu:18.04 AS build

ENV         DS_VERSION=0.6.1

WORKDIR     /opt

COPY        . .

RUN \
            apt-get update -y && \
            apt-get install -y --no-install-recommends ca-certificates curl python build-essential wget && \
            curl -sL https://deb.nodesource.com/setup_10.x | bash - && \
            apt-get install -y --no-install-recommends nodejs && \
            wget -c https://github.com/mozilla/DeepSpeech/releases/download/v${DS_VERSION}/deepspeech-${DS_VERSION}-models.tar.gz && \
            tar -xvzf deepspeech-${DS_VERSION}-models.tar.gz && \
            mv deepspeech-${DS_VERSION}-models models && \
            rm deepspeech-${DS_VERSION}-models.tar.gz && \
            npm install --production && \
            apt-get autoremove -y && \
            apt-get clean -y

FROM ubuntu:18.04 AS release

WORKDIR     /opt

CMD         []
#CMD         nodejs index.js
ENTRYPOINT  ["nodejs", "index.js"]

COPY        --from=build /opt/ .

EXPOSE      8885

RUN \
            apt-get update -y && \
            apt-get install -y --no-install-recommends ca-certificates curl && \
            curl -sL https://deb.nodesource.com/setup_10.x | bash - && \
            apt-get install -y --no-install-recommends nodejs && \
            apt-get autoremove -y && \
            apt-get clean -y && \
            rm -rf /var/lib/apt/lists/*

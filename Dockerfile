#
# vSpeech Dockerfile
#
# Author: Igor Fritzsch
# Created 21.02.2019
# See https://docs.docker.com/get-started/part2/#dockerfile
# vSpeech is a nodejs webserver listen on port 3000 that handles the conversion of the live audio stream

# docker rmi vspeech
# docker build -t vspeech .
# docker run --name vspeech -p 1935:1935 -p 3000:3000 -d vspeech
# docker run --name vspeech -p 1935:1935 -p 3000:3000 -it vspeech /bin/bash

# Use the official debian runtime as a parent image
FROM debian:stretch-slim

# Install the basic things
RUN apt-get update \
   && apt-get install -y \
      sudo \
      curl \
	  gnupg1 \
	  nano \
   && apt-get install -y \
      autoconf \
      automake \
      build-essential \
      cmake \
      git-core \
      libass-dev \
      libfreetype6-dev \
      libsdl2-dev \
      libtool \
      libva-dev \
      libvdpau-dev \
      libvorbis-dev \
      libxcb1-dev \
      libxcb-shm0-dev \
      libxcb-xfixes0-dev \
      pkg-config \
      texinfo \
      wget \
      zlib1g-dev \
   && apt-get install -y \
      nasm \
      yasm \
      libx264-dev \
      libx265-dev \
      libnuma-dev \
      libvpx-dev \
      libmp3lame-dev \
      libopus-dev \
   && apt-get clean \
   && rm -rf /var/lib/apt/lists/*

# Install ffmpeg
RUN mkdir -p ~/ffmpeg_sources ~/bin && \
    cd ~/ffmpeg_sources && \
    git -C fdk-aac pull 2> /dev/null || git clone --depth 1 https://github.com/mstorsjo/fdk-aac && \
    cd fdk-aac && \
    autoreconf -fiv && \
    ./configure --prefix="$HOME/ffmpeg_build" --disable-shared && \
    make && \
    make install && \
    cd ~/ffmpeg_sources && \
    wget -O ffmpeg-snapshot.tar.bz2 https://ffmpeg.org/releases/ffmpeg-snapshot.tar.bz2 && \
    tar xjvf ffmpeg-snapshot.tar.bz2 && \
    cd ffmpeg && \
    PATH="$HOME/bin:$PATH" PKG_CONFIG_PATH="$HOME/ffmpeg_build/lib/pkgconfig" ./configure \
          --prefix="$HOME/ffmpeg_build" \
          --pkg-config-flags="--static" \
          --extra-cflags="-I$HOME/ffmpeg_build/include" \
          --extra-ldflags="-L$HOME/ffmpeg_build/lib" \
          --extra-libs="-lpthread -lm" \
          --bindir="$HOME/bin" \
          --enable-gpl \
          --enable-libass \
          --enable-libfdk-aac \
          --enable-libfreetype \
          --enable-libmp3lame \
          --enable-libopus \
          --enable-libvorbis \
          --enable-libvpx \
          --enable-libx264 \
          --enable-libx265 \
          --enable-nonfree && \
        PATH="$HOME/bin:$PATH" make && \
        make install && \
        hash -r && \
        cp ~/bin/ff* /usr/local/bin/

# Copy related files
COPY /vspeech /opt/

# Set the working directory
WORKDIR /opt/

# Install nodejs
RUN curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
RUN apt-get install -y nodejs

# Install pre-trained model
RUN wget https://github.com/mozilla/DeepSpeech/releases/download/v0.6.1/deepspeech-0.6.1-models.tar.gz && \
    tar xvfz deepspeech-0.6.1-models.tar.gz && \
    mv deepspeech-0.6.1-models models

# Run service
RUN npm install

# Run service forever
CMD node ./bin/www

# Expose ports
EXPOSE 1935 3000

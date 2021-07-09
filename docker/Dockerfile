FROM ubuntu:latest
MAINTAINER IvanAbramenko <vaxann@gmail.com>

RUN apt-get update

RUN apt-get install -y language-pack-ru
ENV LANG ru_RU.UTF-8

## Install transmission
RUN apt-get -y install software-properties-common \
    && add-apt-repository -y ppa:transmissionbt/ppa \
    && apt-get update -q \
    && apt-get install -qy transmission-daemon \
    && mkdir -p /data
#     && mkdir -p /var/run/transmission-daemon

EXPOSE 9091
# TODO: Add volume for download dir

## Install node
RUN apt-get install -y curl gnupg \
    && curl -sL https://deb.nodesource.com/setup_12.x | bash - \
    && apt-get install -y nodejs git git-core \
    && ln -s /usr/local/bin/node /usr/local/bin/nodejs \
    && mkdir -p /etc/torrentLassoEDGE/ /etc/torrentLassoEDGE/transmission-daemon

# Def configs
COPY ./docker/config.json /etc/torrentLassoEDGE/config.json
COPY ./docker/settings.json /etc/torrentLassoEDGE/transmission-daemon/settings.json

#store transmission files
VOLUME /etc/torrentLassoEDGE/transmission-daemon

WORKDIR /usr/bin/torrentLassoEDGE

## Local Version (comment this block if production)
# COPY package.json .
# RUN npm install && mkdir dist

# Add mappigs when start container:
# -v <Host project path>/dist/config/config.json:/etc/torrentLassoEDGE/config.json
# -v <Host project path>/src:/usr/bin/torrentLassoEDGE/src
# -v <Host project path>/tsconfig.json:/usr/bin/torrentLassoEDGE/tsconfig.json
# -v <Host project path>/dist:/usr/bin/torrentLassoEDGE/dist

## Production Version deploing from Github (comment this block if development)
# RUN git clone https://github.com/vaxann/torrentLassoEDGE.git /usr/bin/torrentLassoEDGE

## Production Config for local image build
COPY package.json .
COPY tsconfig.json .
COPY src src/
RUN npm install && npm install typescript -g && mkdir dist && npm run-script build

CMD node /usr/bin/torrentLassoEDGE/dist/index.js


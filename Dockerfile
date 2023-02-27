FROM ubuntu:latest

RUN apt-get update

RUN apt-get install -y language-pack-ru
ENV LANG ru_RU.UTF-8

RUN apt-get install -qy transmission-daemon \
    && mkdir -p /data

EXPOSE 9091

## Install node
RUN apt-get install -y curl gnupg \
    && apt-get install -y nodejs npm git git-core \
    && ln -s /usr/local/bin/node /usr/local/bin/nodejs \
    && mkdir -p /etc/torrentLassoEDGE/ /etc/torrentLassoEDGE/transmission-daemon

# Def configs
COPY ./configs/config.json /etc/torrentLassoEDGE/config.json
COPY ./configs/settings.json /etc/torrentLassoEDGE/transmission-daemon/settings.json

WORKDIR /usr/app
COPY package.json .
COPY tsconfig.json .
COPY src ./src
RUN npm install \ 
    && npm install typescript -g \ 
    && mkdir dist \
    && npm run build

CMD npm run start



# TorrentLassoEDGE
Собственный торрент клиент для TorrentLassoBot

## Запуск Docker контейнера:

    docker run \
        -p :9091:9091/tcp \
        --name torrentlassoedge \
        --restart=always \ 
        -v <path to torrent download folder>/data \
        -e TOKEN=<jwt token> \ 
        -e TRANSMISSION:USER=<username> \ 
        -e TRANSMISSION:PASSWORD=<password> \
        vaxann/torrentlassoedgeimg:latest

Если вы не хотите использовать web-интерфейс TransmissionBt, который также находиться к контейнере, конфигурацию можно упростить
    
    docker run \
        --name torrentlassoedge \
        --restart=always \ 
        -v <path to torrent download folder>/data \
        -e TOKEN=<jwt token> \ 
        vaxann/torrentlassoedgeimg:latest 

Опционально возможно дополнить команду запуска маппингом конфигурации, если вы хотите сделать ее отличной от стандартной:
        
        -v <path to config on host>/config.json:/etc/torrentLassoEDGE/config.json \


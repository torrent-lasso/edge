# TorrentLassoEDGE
Proprietary torrent client for TorrentLassoBot

## Start the Docker container:

    docker run \
        -p :9091:9091/tcp \.
        --name torrentlassoedge
        --restart=always 
        -v <path to torrent download folder>/data.
        -e TOKEN=<jwt token> \. 
        -e TRANSMISSION:USER=<username> \. 
        -e TRANSMISSION:PASSWORD=<password> \ -e TRANSMISSION:PASSWORD=<password> \
        vaxann/torrentlassoedgeimg:latest

If you don't want to use the TransmissionBt web-interface, which is also in the container, the configuration can be simplified.
    
    docker run \
        --name torrentlassoedge \
        --restart=always 
        -v <path to torrent download folder>/data.
        -e TOKEN=<jwt token> -- 
        vaxann/torrentlassoedgeimg:latest 

Optionally it is possible to add configuration mapping to the startup command if you want to make it different from the standard one:
        
        -v <path to config on host>/config.json:/etc/torrentLassoEDGE/config.json \


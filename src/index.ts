import _ from "lodash";
import Socket from "socket.io-client";
import fs  from "fs";

import Config   from "./config";
import Log      from "./log";
import Torrent, {IAddStatus, IProto} from "./torrents"
import {any} from "nconf";
import {stringify} from "querystring";

const  pjson = require("../package.json");

const log = Log(module);

log.info(`Starting TorrentLassoEDGE ${pjson.version}...`);

const local:boolean = Config.get('transmission:local') || Config.get('transmission_local');
log.debug(`transmission:local=${local}`);
const proto:IProto = Config.get('transmission:proto') || Config.get('transmission_proto') || "http";
log.debug(`transmission:proto=${proto}`);
const host:string = Config.get('transmission:host') || Config.get('transmission_host') || "localhost";
log.debug(`transmission:host=${host}`);
const port:number = Config.get('transmission:port') || Config.get('transmission_port') ||9091;
log.debug(`transmission:port=${port}`);
const user:string|undefined = Config.get('transmission:user') || Config.get('transmission_user') || undefined;
log.debug(`transmission:user=${user}`);
const password:string|undefined = Config.get('transmission:password') || Config.get('transmission_password') || undefined;
log.debug(`transmission:password=${password}`);
const path:string|undefined = Config.get('transmission:path') || Config.get('transmission_path') || undefined;
log.debug(`transmission:path=${path}`);
const args:Array<string>|undefined = Config.get('transmission:args') || Config.get('transmission_args') ||undefined;
log.debug(`transmission:args=${args}`);


const token:string = Config.get('torrentlassobot:token') || Config.get('torrentlassobot_token');
log.debug(`torrentlassobot:token=${token}`);

const uri:string = _.trimEnd(Config.get('torrentlassobot_uri') || Config.get('torrentlassobot:uri'), '/') + "/?token="+token;
log.debug(`uri=${uri}`);

if (!token || !uri) {
    log.error("Can't defined main configuration parameters! Exit process");
    process.exit(-1);
}

const torrent  = new Torrent(local, proto, host, port, user, password, path, args);

let stopTransfer:number = -1;

torrent.init((err)=>{
    if (err) return log.error(err);

    const socket = Socket(uri);  //{path:'/edge'}
    socket.on('connect', ()=>{
        log.info("Connected to torrentLassoBot");


        //socket.emit('auth', {token:token});
    });

    socket.on('auth-error', (err:string)=>{
        log.error(err);
    });

    socket.on("torrent-get", (
        hash: string | Array<string>,
        param: string | Array<string>,
        callback:(err?: string|null, status?: Object|Array<Object>|string|number) => void) =>{
            log.debug(`Received message="torrent-get" hash=${hash}, param=${param}`);

            torrent.getParam(hash,param, (err, status)=>{
                if (err) return callback(err.message);

                log.debug(`torrent-get with hash=${hash}, param=${param} returns status=${status}`);
                callback(null, status);
            });
    });

    socket.on("free-space", (
        path: string,
        callback:(err?: string|null, space?: {}) => void) =>{
            log.debug(`Received message="free-space" for path=${path}`);

            torrent.freeSpace(path, (err, space)=>{
                if (err) return callback(err.message);

                log.debug(`free-space with path=${path} returns space=${JSON.stringify(space)}`);
                callback(null, space);
            });
        }
    );

    socket.on("get-param", (
        hash: string | Array<string>,
        param: string | Array<string>,
        callback:(err?: string|null, status?: Object|Array<Object>|string|number) => void) =>{
            log.debug(`Received message="get-param" for hash=${hash}, param=${param}`);

            torrent.getParam(hash,param, (err, status)=>{
                if (err) return callback(err.message);

                log.debug(`get-param with hash=${hash}, param=${param} returns status=${JSON.stringify(status)}`);
                callback(null, status);
            });
        }
    );

    socket.on("torrent-add", (
        torrentFileName:string,
        torrentData:string,
        dir:string,
        callback:(err?: string|null, status?:IAddStatus, torrentHash?:string, id?:number) => void)=>{
            log.debug(`Received message="torrent-add" for torrentFileName=${torrentFileName}, torrentData.length=${torrentData.length}, dir=${dir}`);

            torrent.addTorrent(torrentFileName,torrentData,dir,(err, status, torrentHash, id)=>{
                if (err) return callback(err.message);

                log.debug(`torrent-add with torrentFileName=${torrentFileName}, torrentData.length=${torrentData.length}, dir=${dir} returns status=${status}, torrentHash=${torrentHash}, id=${id}`);
                callback(null, status, torrentHash, id);
            });

    });

    socket.on("torrent-remove", (
        hash: string | Array<string>,
        deleteData: boolean,
        callback:(err?: string|null, body?:{}) => void) =>{
            log.debug(`Received message="torrent-remove" for hash=${hash}, deleteData=${deleteData}`);

            torrent.removeTorrent(hash,deleteData, (err, body)=>{
                if (err) return callback(err.message, body);

                log.debug(`torrent-remove with hash=${hash}, deleteData=${deleteData} returns OK!`);
                callback();
            });
        }
    );

    socket.on("torrent-stop", (
        hash: string | Array<string>,
        action: boolean,
        callback:(err?: string|null, body?:{}) => void) =>{
            log.debug(`Received message="torrent-stop" for hash=${hash}, action=${action}`);

            torrent.stopTorrent(hash, action, (err, body)=>{
                if (err) return callback(err.message, body);

                log.debug(`torrent-stop with hash=${hash}, action=${action} returns OK!`);
                callback();
            });
        }
    );

    socket.on("file-size", (
        filename:string,
        callback:(err?: string|null, size?: number) => void ) => {
            log.debug(`Received message="file-size" for filename=${filename}`);
            fs.stat(filename, (err, stats)=>{
                if (err == null) {
                    callback(null,stats.size);
                } else if (err.code) {
                    callback(err.message);
                }
            });
        }
    );

    socket.on("start-transfer", (filename:string, transferId:number)=>{
        let readStream = fs.createReadStream(filename,{encoding: 'binary'});

        log.debug(`Start streaming filename=${filename}`);

        readStream.on('data',  (chunk) => {
            if (stopTransfer === transferId) {
                readStream.destroy();
                stopTransfer = -1;
                return;
            }

            log.debug(`file-transfer chunk.length=${chunk.length}`);
            socket.emit('file-transfer', transferId, Buffer.from(chunk, 'binary').toString('base64'));
        });

        readStream.on('end',  () => {
            log.debug(`Stop streaming filename=${filename}`);
        });
    });

    socket.on("stop-transfer", (transferId:number) =>{
        stopTransfer = transferId;
    });

    socket.on('disconnect',  () => {
        log.info("Disconnect from torrentLassoBot");
    });
});



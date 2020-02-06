import Log from "../log";
import request, {CoreOptions} from "request"
import _ from "lodash";
import TransProcess from "./trans-process";

const log = Log(module);

export type IProto = "http" | "https";
export type IAddStatus = "torrent-added" | "torrent-duplicate";

export default class Transmission {
    uri: string;
    options: CoreOptions;
    local : boolean;
    transProcess?:TransProcess;

    constructor(local:boolean, proto: IProto, host: string, port: number, user?: string, password?: string, path?: string, args?: Array<string>) {
        if (user && password) {
            this.options = {
                auth: {
                    user: user,
                    pass: password,
                    sendImmediately: true
                }
            }
        } else {
            this.options = {}
        }
        this.options.followRedirect = false;
        this.options.json = true;
        this.local = local;
        this.uri = `${proto}://${host}:${port}/`;

        if (path && args)
            this.transProcess = new TransProcess(path, args, user, password);
    }

    init(callback: (err?:Error|null)=>void):void{
        const getUrl = ()=>{
            request.get(this.uri, this.options, (err, response) => {
                if (err) return callback(err);

                if (response.statusCode < 300 || response.statusCode > 399)
                    return callback(new Error(`StatusCode=${response.statusCode} not equal 3XX`));

                if (!response.headers || !response.headers.location)
                    return callback(new Error("Can't find location in headers"));

                const location = response.headers.location.split('/').slice(1, 2).join('/');

                this.uri = `${this.uri}${location}/rpc`;
                callback();
            });
        };

        if (this.local && this.transProcess) {
            this.transProcess.init((err)=>{
               if (err) return callback(err);

               getUrl();
            });
        } else {
            getUrl();
        }
    }

    getParam(hash: string | Array<string>, param: string | Array<string>, callback: (err?: Error|null, status?: Object|Array<Object>|string|number, body?:{}) => void,
             cycle: number = 0, isHashArray:boolean=true, isParamsArray:boolean=true): void {

        if (!(hash instanceof Array)) {
            hash = [hash];
            isHashArray = false;
        } else {
            if (!hash.length)
                return callback(new Error('hash can\'t defined'));
        }

        if (!(param instanceof Array)) {
            param = [param];
            isParamsArray = false;
        } else {
            if (!param.length)
                return callback(new Error('param can\'t defined'));
        }

        const opts = _.cloneDeep(this.options);
        opts.body  = {
            'method':'torrent-get',
            'arguments':{
                'fields': param,
                'ids': hash}
        };


        request.post(this.uri, opts, (err, response, body)=>{
            if (err) return callback(err);

            if (response.statusCode === 409 && response.headers['x-transmission-session-id']) {
                if (cycle > 1) return callback(new Error('Error looping with x-transmission-session-id'));

                this.options.headers = {'x-transmission-session-id' : response.headers['x-transmission-session-id']};
                return this.getParam(hash, param, callback, cycle+1, isHashArray, isParamsArray);
            }

            if (response.statusCode !== 200)
                return callback(new Error('Bad statusCode '+ response.statusCode));

            if (!body || !(body instanceof Object))
                return callback(new Error('Can\'t parse body: '+ body));

            if (body.result && body.result === 'success' && body.arguments) {
                const args = body.arguments.torrents;

                if (!args || args.length !== hash.length)
                    return callback(new Error('Response args count can\'t  equal requested hashes'));

                for(let i = 0; i < args.length; i++) {
                    for(let j= 0; j < param.length; j++)
                        if (typeof args[i][param[j]] === "undefined")
                            return callback(new Error('Cant\'t find requested param '+ param[j]));

                    if (!isParamsArray)
                        args[i] = args[i][param[0]];
                }

                if (isHashArray)
                    callback(null, args);
                else
                    callback(null, args[0]);
            } else
                callback(new Error('Can\'t find torrent data'), body);

        });

    }

    freeSpace(path:string, callback:(err?:Error|null, space?: {}, body?: {})=>void, cycle:number=0):void {
        const opts = _.cloneDeep(this.options);
        opts.body  = {
            'method':'free-space',
            'arguments':{
                'path':path
            }
        };

        request.post(this.uri, opts, (err, response, body)=> {
            if (err) return callback(err);

            if (response.statusCode === 409 && response.headers['x-transmission-session-id']) {
                if (cycle > 1) return callback(new Error('Error looping with x-transmission-session-id'));

                this.options.headers = {'x-transmission-session-id' : response.headers['x-transmission-session-id']};
                return this.freeSpace(path, callback, cycle+1);
            }

            if (response.statusCode !== 200)
                return callback(new Error('Bad statusCode '+ response.statusCode));

            if (!body || !(body instanceof Object))
                return callback(new Error('Can\'t parse body: '+ body));


            if (body.result && body.result === 'success') {

                if (!body.arguments || !(body.arguments instanceof Object))
                    return callback(new Error('Can\'t parse arguments: '+ body.arguments));

                callback(null, body.arguments);
            } else
                callback(new Error('Can\'t calculate free space'), body);
            
        });

    }

    addTorrent(torrentFileName:string, torrentData:string, dir:string, callback:(err?: Error|null, status?:IAddStatus, torrentHash?:string, id?:number) => void, cycle:number=0):void {
        const opts = _.cloneDeep(this.options);
        opts.body = {
                'method': 'torrent-add',
                'arguments': {
                    'paused': false,
                    'download-dir': dir,
                    'metainfo': torrentData
                }
            };

        request.post(this.uri, opts, (err, response, body) => {
            if (err) return callback(err);

            if (response.statusCode === 409 && response.headers['x-transmission-session-id']) {
                if (cycle > 1) return callback(new Error('Error looping with x-transmission-session-id'));

                this.options.headers = {'x-transmission-session-id' : response.headers['x-transmission-session-id']};
                return this.addTorrent(torrentFileName, torrentData, dir, callback, cycle+1);
            }

            if (response.statusCode !== 200)
                return callback(new Error(`Bad statusCode = ${response.statusCode} for torrent ${torrentFileName}`));

            if (!body || !(body instanceof Object))
                return callback(new Error('Can\'t parse body: '+ body));

            if (body.result && body.result === 'success') {
                if (body.arguments['torrent-added']) {
                    const arg = body.arguments['torrent-added'];
                    callback(null, 'torrent-added', arg.hashString, arg.id);
                } else if (body.arguments['torrent-duplicate']) {
                    const arg = body.arguments['torrent-duplicate'];
                    callback(null, 'torrent-duplicate', arg.hashString, arg.id);
                } else
                    callback(new Error(`Torrent ${torrentFileName} does not added, reason: ${JSON.stringify(body)}`));
            } else
                callback(new Error(`Torrent ${torrentFileName} does not added, reason: ${JSON.stringify(body)}`));

        });
    };

    removeTorrent(hash:string|Array<string>, deleteData:boolean, callback: (err?: Error|null, body?:{})=>void, cycle:number=0, isHashArray:boolean=true):void {
        if (!(hash instanceof Array)) {
            hash = [hash];
            isHashArray = false;
        } else {
            if (!hash.length)
                return callback(new Error('hash can\'t defined'));
        }

        const opts = _.cloneDeep(this.options);
        opts.body  = {
            'method':'torrent-remove',
            'arguments':{
                'delete-local-data':deleteData,
                'ids': hash}
        };

        request.post(this.uri, opts, (err, response, body) => {
            if (err) return callback(err);

            if (response.statusCode === 409 && response.headers['x-transmission-session-id']) {
                if (cycle > 1) return callback(new Error('Error looping with x-transmission-session-id'));

                this.options.headers = {'x-transmission-session-id' : response.headers['x-transmission-session-id']};
                return this.removeTorrent(hash, deleteData, callback, cycle+1, isHashArray);
            }

            if (response.statusCode !== 200)
                return callback(new Error('Bad statusCode '+ response.statusCode));

            if (!body || !(body instanceof Object))
                return callback(new Error('Can\'t parse body: '+ body));

            if (body.result && body.result === 'success') {
                callback();
            } else
                callback(new Error('Torrent does not removed'), body);

        });
    };

    stopTorrent(hash:string|Array<string>, action:boolean, callback:(err?: Error|null, body?:{})=>void, cycle:number=0, isHashArray:boolean=true):void {
        if (!(hash instanceof Array)) {
            hash = [hash];
            isHashArray = false;
        } else {
            if (!hash.length)
                return callback(new Error('hash can\'t defined'));
        }

        const opts = _.cloneDeep(this.options);
        opts.body  = {
            'method': ((action)?'torrent-start':'torrent-stop'),
            'arguments':{
                'ids': hash}
        };

        request.post(this.uri, opts, (err, response, body) => {
            if (err) return callback(err);

            if (response.statusCode === 409 && response.headers['x-transmission-session-id']) {
                if (cycle > 1) return callback(new Error('Error looping with x-transmission-session-id'));

                this.options.headers = {'x-transmission-session-id' : response.headers['x-transmission-session-id']};
                return this.stopTorrent(hash, action, callback, cycle+1, isHashArray);
            }

            if (response.statusCode !== 200)
                return callback(new Error('Bad statusCode '+ response.statusCode));

            if (!body || !(body instanceof Object))
                return callback(new Error('Can\'t parse body: '+ body));

            if (body.result && body.result === 'success') {
                callback();
            } else
                callback(new Error(`Method ${(action)?'torrent-start':'torrent-stop'} can't applied`), body);

        });
    };

}
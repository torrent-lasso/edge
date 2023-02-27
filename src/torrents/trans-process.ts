import Log from '../log';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const log = Log(module);

export default class TransProcess {
  path: string;
  args: Array<string>;
  user?: string;
  password?: string;

  constructor(
    path: string,
    args: Array<string>,
    user?: string,
    password?: string
  ) {
    // TODO: Check path & args
    if (fs.existsSync(path)) this.path = path;
    else throw Error('');

    this.args = args;
    this.user = user;
    this.password = password;
  }

  init(callback: (err?: Error | null) => void): void {
    __editConfig(this.args[2], this.user, this.password, (err) => {
      if (err) return callback(err);

      const transProcess = spawn(this.path, this.args);
      let hasErr = false;

      transProcess.on('error', (err) => {
        hasErr = true;
        callback(err);
      });

      transProcess.stdout.on('data', (data) => {
        log.debug(`Transmission stdout: ${data}`);
      });

      transProcess.stderr.on('data', (data) => {
        log.debug(`Transmission stderr: ${data}`);
      });

      transProcess.on('exit', (code) => {
        log.error(`TransmissionBt process exited with code ${code}`);
        process.exit(-1);
      });

      setTimeout(() => {
        if (!hasErr) callback();
      }, 10000);
    });
  }
}

function __editConfig(
  configPath: string,
  user: string | undefined,
  password: string | undefined,
  callback: (err?: Error | null) => void
): void {
  fs.readFile(path.join(configPath, 'settings.json'), 'utf8', (err, data) => {
    if (err) return callback(err);
    let config;

    try {
      config = JSON.parse(data);
    } catch (e) {
      if (e) return callback(e);
    }

    if (user && password) {
      config['rpc-authentication-required'] = true;
      config['rpc-username'] = user;
      config['rpc-password'] = password;
    } else {
      config['rpc-authentication-required'] = false;
    }

    fs.writeFile(
      path.join(configPath, 'settings.json'),
      JSON.stringify(config),
      callback
    );
  });
}

// eslint-disable-next-line no-undef
import Module = NodeJS.Module;
import { createLogger, format, transports } from 'winston';
const { combine, timestamp, label, printf, prettyPrint, colorize } = format;

export default function getLogger(module: Module) {
  const appStatus = process.env.NODE_ENV;
  const path: string = module.filename.split('/').slice(-2).join('/');

  // @ts-ignore
  const myFormat = printf(({ level, message, label, timestamp }) => {
    if (message.constructor === Object) {
      message = JSON.stringify(message, null, 4);
    }
    return `${timestamp} [${label}] ${level}: ${message}`;
  });

  return createLogger({
    format: combine(
      label({ label: path }),
      colorize(),
      timestamp({ format: 'DD-MM-YYYY HH:mm:ss' }),
      prettyPrint(),
      myFormat
    ),
    transports: [
      new transports.Console({
        level:
          appStatus === 'DEV' || appStatus === 'UNITTEST' ? 'debug' : 'info',
      }),
    ],
  });
}

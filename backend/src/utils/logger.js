const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;
require('winston-daily-rotate-file');

const myFormat = printf(({ level, message, timestamp, channelName }) => {
  const prefix = channelName ? `[${channelName}] ` : '';
  return `[${timestamp}] ${prefix}${message}`;
});

const fileRotateTransport = new transports.DailyRotateFile({
  filename: 'application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  dirname: './.local/logs'
});

const logger = createLogger({
  level: 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    myFormat
  ),
  transports: [
    new transports.Console(),
    fileRotateTransport,
  ]
});

module.exports = logger;
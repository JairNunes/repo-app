import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import { getCorrelationStore } from './correlation-id';

const isProd = process.env.NODE_ENV === 'production';

const correlationFormat = winston.format((info) => {
  const store = getCorrelationStore();
  if (store) {
    info.correlationId = store.correlationId;
    if (store.userId) info.userId = store.userId;
    if (store.userType) info.userType = store.userType;
  }
  return info;
})();

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  correlationFormat,
  winston.format.json(),
);

const devFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.colorize(),
  correlationFormat,
  nestWinstonModuleUtilities.format.nestLike('AutoRepairShop', {
    colors: true,
    prettyPrint: true,
  }),
);

export const winstonConfig: winston.LoggerOptions = {
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  defaultMeta: {
    service: 'auto-repair-shop-api',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    new winston.transports.Console({
      format: isProd ? jsonFormat : devFormat,
      handleExceptions: true,
    }),
  ],
  exitOnError: false,
};

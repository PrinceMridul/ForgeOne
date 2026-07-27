import pino from 'pino';

export type Logger = pino.Logger;
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface LoggerOptions {
  name: string;
  level?: LogLevel;
  pretty?: boolean;
}

export function createLogger(options: LoggerOptions): pino.Logger {
  const { name, level = 'info', pretty } = options;
  const isDev = process.env.NODE_ENV === 'development';
  const usePretty = pretty ?? isDev;

  return pino({
    name,
    level,
    ...(usePretty ? {
      transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' } },
    } : {}),
  });
}

export const logger = createLogger({ name: 'forgeone', level: (process.env.LOG_LEVEL as LogLevel) ?? 'info' });
export default logger;

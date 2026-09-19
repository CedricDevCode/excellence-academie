type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: any;
}

const LOG_LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL: number = LOG_LEVELS[process.env.LOG_LEVEL as LogLevel] || LOG_LEVELS.info;

function formatEntry(entry: LogEntry): string {
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]${entry.context ? ` [${entry.context}]` : ''}`;
  const msg = `${prefix} ${entry.message}`;
  if (entry.data !== undefined) {
    return `${msg} ${JSON.stringify(entry.data)}`;
  }
  return msg;
}

function log(level: LogLevel, message: string, context?: string, data?: any) {
  if (LOG_LEVELS[level] < MIN_LEVEL) return;

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
    data,
  };

  const formatted = formatEntry(entry);

  switch (level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'debug':
      console.debug(formatted);
      break;
    default:
      console.log(formatted);
  }
}

export const logger = {
  debug: (message: string, context?: string, data?: any) => log('debug', message, context, data),
  info: (message: string, context?: string, data?: any) => log('info', message, context, data),
  warn: (message: string, context?: string, data?: any) => log('warn', message, context, data),
  error: (message: string, context?: string, data?: any) => log('error', message, context, data),
};

export default logger;

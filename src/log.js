const winston = require('winston');
const { createLogger, transports, format } = winston;

const logLevel = (process.env.LOG_LEVEL || 'debug').toLowerCase();
const logger = createLogger({
  level: logLevel,
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'gitter-forwarder' },
  transports: [
    // - Write to all logs with level `info` and below to `combined.log`
    // - Write all logs error (and below) to `error.log`.
    new transports.File({ filename: 'gitter-forwarder-error.log', level: 'error' }),
    new transports.File({ filename: 'gitter-forwarder-combined.log' })
  ]
});

// If we're not in production then **ALSO** log to the `console`
// with the colorized simple format.
logger.add(new transports.Console({
  format: format.combine(
    format.colorize(),
    format.simple()
  )
}));

module.exports = {
  logger: logger,
  logLevel: logLevel,
};
const { createLogger, format, transports } = require('winston');
const path = require('path');

const logger = createLogger({
  level: 'info',  // Set default log level
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    // Console transport to show logs in the console
    new transports.Console({
      format: format.combine(
        format.colorize(), // Add colors for console output
        format.simple()
      )
    }),
    // Info level logs
    new transports.File({
      filename: path.join(__dirname, '../logs/info.log'),
      level: 'info',
    }),
    // Error level logs
    new transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
    })
  ],
  exitOnError: false, // Prevent exit on handled exceptions
});

module.exports = logger;

/**
 * Logger Utility - Centralized logging supporting both direct imports and destructuring
 */

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

class Logger {
    success(message, ...args) {
        console.log(`${colors.green}✅ ${message}${colors.reset}`, ...args);
    }

    error(message, error = null, ...args) {
        console.log(`${colors.red}❌ ${message}${colors.reset}`, ...args);
        if (error) console.error(error);
    }

    warn(message, ...args) {
        console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`, ...args);
    }

    info(message, ...args) {
        console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`, ...args);
    }

    debug(message, ...args) {
        console.log(`${colors.cyan}🔧 ${message}${colors.reset}`, ...args);
    }
}

const loggerInstance = new Logger();
loggerInstance.logger = loggerInstance; // Support { logger } = require(...)

module.exports = loggerInstance;

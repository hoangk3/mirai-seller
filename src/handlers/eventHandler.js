/**
 * Unified Event Handler - Auto-loads all event files and binds them to the client
 */

const fs = require('node:fs');
const path = require('node:path');
const logger = require('../utils/logger');

async function loadEvents(client) {
    const eventsPath = path.join(__dirname, '../events');

    if (!fs.existsSync(eventsPath)) {
        logger.info('Thư mục events không tồn tại');
        return [];
    }

    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    const loadedEvents = [];

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);

        try {
            const event = require(filePath);

            if ('name' in event && 'execute' in event) {
                // Determine once or on
                if (event.once) {
                    client.once(event.name, (...args) => event.execute(...args, client));
                } else {
                    client.on(event.name, (...args) => event.execute(...args, client));
                }
                loadedEvents.push(event.name);
            } else {
                logger.warn(`Event ${file} không có name hoặc execute`);
            }
        } catch (error) {
            logger.error(`Lỗi nạp event ${file}:`, error);
        }
    }

    logger.success(`Đã nạp ${loadedEvents.length} event`);
    return loadedEvents;
}

module.exports = { loadEvents };

const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        logger.success(`🚀 Bot is ready! Logged in as ${client.user.tag}`);
    },
};

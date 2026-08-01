/**
 * Unified Deploy Commands - Register all slash commands to Discord
 */

const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// Nạp .env từ thư mục gốc của bot
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const logger = require('./utils/logger');

(async () => {
    try {
        const commands = [];
        const foldersPath = path.join(__dirname, 'commands');

        if (!fs.existsSync(foldersPath)) {
            logger.error('Thư mục commands không tồn tại');
            process.exit(1);
        }

        const commandFolders = fs.readdirSync(foldersPath);

        for (const folder of commandFolders) {
            const commandsPath = path.join(foldersPath, folder);
            
            if (!fs.lstatSync(commandsPath).isDirectory()) continue;

            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                // Tránh nạp lại help của moderation
                if (folder === 'moderation' && file === 'help.js') {
                    continue;
                }

                const filePath = path.join(commandsPath, file);
                const command = require(filePath);

                if ('data' in command && 'execute' in command) {
                    commands.push(command.data.toJSON());
                } else {
                    logger.warn(`Lệnh ${file} không có data hoặc execute (Slash Command)`);
                }
            }
        }

        const token = process.env.TOKEN || process.env.DISCORD_TOKEN;
        const clientId = process.env.CLIENT_ID;
        const guildId = process.env.GUILD_ID;

        if (!token || !clientId || !guildId) {
            throw new Error('TOKEN/DISCORD_TOKEN, CLIENT_ID, hoặc GUILD_ID không được định nghĩa trong .env');
        }

        const rest = new REST().setToken(token);

        logger.info(`🔄 Đang nạp ${commands.length} lệnh Slash...`);

        // Clear global commands
        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        logger.info('✅ Đã xóa các lệnh global');

        const guildIds = guildId.split(/[,|\s]+/).map(id => id.trim()).filter(Boolean);
        if (guildIds.length === 0) {
            throw new Error('GUILD_ID trong .env trống hoặc không đúng định dạng');
        }

        for (const gId of guildIds) {
            try {
                logger.info(`🔄 Đang đăng ký lệnh Slash cho server ID: ${gId}...`);
                const data = await rest.put(
                    Routes.applicationGuildCommands(clientId, gId),
                    { body: commands }
                );
                logger.success(`✅ Đã cập nhật ${data.length} lệnh Slash cho server ${gId} thành công!`);
            } catch (err) {
                logger.error(`❌ Lỗi deploy commands cho server ID: ${gId}:`, err.message);
            }
        }
    } catch (error) {
        logger.error('❌ Lỗi deploy commands:', error.message);
        process.exit(1);
    }
})();

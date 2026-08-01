/**
 * Unified Command Handler - Auto-loads both Slash Commands and Prefix Commands from all subfolders
 */

const fs = require('node:fs');
const path = require('node:path');
const logger = require('../utils/logger');

async function loadCommands(client) {
    const commandsPath = path.join(__dirname, '../commands');

    if (!fs.existsSync(commandsPath)) {
        logger.warn('Thư mục commands không tồn tại');
        return [];
    }

    // Initialize collections
    if (!client.commands) {
        client.commands = new (require('discord.js').Collection)();
    }
    if (!client.prefixCommands) {
        client.prefixCommands = new (require('discord.js').Collection)();
    }

    const commandFolders = fs.readdirSync(commandsPath);
    const loadedSlashCommands = [];
    const loadedPrefixCommands = [];

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        
        if (!fs.lstatSync(folderPath).isDirectory()) continue;

        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js') && !file.includes('-new'));

        for (const file of commandFiles) {
            // Tránh nạp lại help command của moderation để không trùng lặp
            if (folder === 'moderation' && file === 'help.js') {
                logger.info('Bỏ qua moderation/help.js vì đã dùng utility/help.js hợp nhất');
                continue;
            }

            const filePath = path.join(folderPath, file);
            
            try {
                const command = require(filePath);
                
                // Set category
                command.category = folder;

                // 1. Load Slash Commands (requires data and execute)
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    if (!loadedSlashCommands.includes(command.data.name)) {
                        loadedSlashCommands.push(command.data.name);
                    }
                }
                
                // 2. Load Prefix Commands
                // Case A: DOTTIE_SERVICE style (has name property and execute method)
                if ('name' in command && 'execute' in command) {
                    client.prefixCommands.set(command.name, command);
                    
                    // Register aliases
                    if (command.aliases && Array.isArray(command.aliases)) {
                        command.aliases.forEach(alias => {
                            client.prefixCommands.set(alias, command);
                        });
                    }
                    if (!loadedPrefixCommands.includes(command.name)) {
                        loadedPrefixCommands.push(command.name);
                    }
                } 
                // Case B: DOTTIE_MANAGER style (has data.name and messageExecute method)
                else if (command.data && command.data.name && 'messageExecute' in command) {
                    client.prefixCommands.set(command.data.name, command);
                    if (!loadedPrefixCommands.includes(command.data.name)) {
                        loadedPrefixCommands.push(command.data.name);
                    }
                } else if (!('data' in command)) {
                    logger.warn(`Lệnh ${file} không có định dạng hợp lệ để chạy prefix hoặc slash`);
                }
            } catch (error) {
                logger.error(`Lỗi nạp lệnh ${file}:`, error);
            }
        }
    }

    logger.success(`Đã nạp ${loadedSlashCommands.length} lệnh Slash`);
    logger.success(`Đã nạp ${loadedPrefixCommands.length} lệnh Prefix`);
    return { slashCommands: loadedSlashCommands, prefixCommands: loadedPrefixCommands };
}

module.exports = { loadCommands };

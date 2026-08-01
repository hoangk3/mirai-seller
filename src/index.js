const { Client, GatewayIntentBits, Collection } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

// Nạp .env từ thư mục gốc
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const logger = require('./utils/logger');
const database = require('./utils/database');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');

// Pre-load các models MongoDB
require('./models/UserData');
require('./models/Backup');
require('./models/Ticket');


// Khởi tạo Discord Client với đầy đủ Intents của cả 2 Bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers
    ]
});


// Nạp các Cấu hình & Emojis cho Client (DOTTIE_MANAGER style)
client.config = require('../config.json');
client.emojis_custom = require('../emoji.json');

// Khởi tạo các Collections cho commands
client.commands = new Collection();
client.prefixCommands = new Collection();

/**
 * Khởi động Bot
 */
async function startBot() {
    try {
        const token = process.env.TOKEN || process.env.DISCORD_TOKEN;
        if (!token) {
            throw new Error('TOKEN/DISCORD_TOKEN không được định nghĩa trong file .env');
        }

        logger.info('🔄 Đang khởi động DOTTIE MANAGER...');

        // 1. Kết nối Database MongoDB
        logger.info('📡 Đang kết nối MongoDB...');
        // Định nghĩa MONGO_URI dự phòng trong môi trường sáp nhập
        if (!process.env.MONGO_URI && process.env.MONGODB_URI) {
            process.env.MONGO_URI = process.env.MONGODB_URI;
        }
        
        const dbConnected = await database.connect();
        if (!dbConnected) {
            logger.warn('⚠️ Cảnh báo: MongoDB không kết nối được. Bot vẫn hoạt động ở chế độ không có database.');
        }

        // 2. Nạp Commands (Prefix & Slash)
        logger.info('📦 Đang nạp lệnh Slash và Prefix...');
        await loadCommands(client);

        // 3. Nạp Events
        logger.info('🎯 Đang nạp event handlers...');
        await loadEvents(client);


        // 5. Đăng nhập Discord
        logger.info('🔐 Đang đăng nhập vào Discord...');
        await client.login(token);

    } catch (error) {
        logger.error('❌ Lỗi khởi động bot:', error.message);
        process.exit(1);
    }
}

/**
 * Xử lý dừng tiến trình an toàn
 */
process.on('SIGINT', async () => {
    logger.info('⏹️ Đang dừng bot...');
    await database.disconnect().catch(() => { });
    await client.destroy();
    process.exit(0);
});

process.on('unhandledRejection', (reason) => {
    if (reason && reason.code === 10062) return; // Bỏ qua lỗi Unknown Interaction
    logger.error('⚠️ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('⚠️ Uncaught Exception:', error.message);
});

// Khởi động hệ thống
startBot();

// Khởi tạo một HTTP server đơn giản để giữ kết nối và phục vụ health check cho hosting
const http = require('node:http');
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('DOTTIE MANAGER is running! 🚀');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    logger.success(`📡 Web Server đang chạy trên port ${PORT} (phục vụ health check hosting)`);
});

#!/usr/bin/env node
/**
 * Bot Structure Verification Script
 * Checks if all necessary files and directories exist
 */

const fs = require('fs');
const path = require('path');

const requiredPaths = [
    'src/index.js',
    'src/deploy-commands.js',
    'src/config/discord-config.js',
    'src/models/UserData.js',
    'src/utils/logger.js',
    'src/utils/database.js',
    'src/handlers/commandHandler.js',
    'src/handlers/eventHandler.js',
    'src/events/interactionCreate.js',
    'src/events/messageCreate.js',
    'package.json'
];

const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m'
};

console.log('\n📋 Đang kiểm tra cấu trúc Bot...\n');

let allGood = true;

requiredPaths.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    const exists = fs.existsSync(fullPath);
    
    if (exists) {
        console.log(`${colors.green}✅${colors.reset} ${filePath}`);
    } else {
        console.log(`${colors.red}❌${colors.reset} ${filePath}`);
        allGood = false;
    }
});

console.log('\n' + '='.repeat(50));

if (allGood) {
    console.log(`${colors.green}✅ Cấu trúc bot hoàn hảo!${colors.reset}\n`);
    console.log('Hướng dẫn chạy:\n');
    console.log('1. Kiểm tra file .env:');
    console.log('   - TOKEN=your_bot_token');
    console.log('   - CLIENT_ID=your_client_id');
    console.log('   - GUILD_ID=your_guild_id');
    console.log('   - MONGO_URI=your_mongodb_uri\n');
    
    console.log('2. Deploy commands:');
    console.log('   node src/deploy-commands.js\n');
    
    console.log('3. Khởi động bot:');
    console.log('   node src/index.js\n');
} else {
    console.log(`${colors.red}❌ Cấu trúc bot không đầy đủ!${colors.reset}`);
    console.log(`${colors.yellow}⚠️  Vui lòng kiểm tra các file còn thiếu${colors.reset}\n`);
    process.exit(1);
}

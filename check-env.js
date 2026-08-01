#!/usr/bin/env node
/**
 * Check .env Loading - Verify environment variables are loaded correctly
 */

const path = require('path');
const fs = require('fs');

// Kiểm tra file .env tồn tại
const envPath = path.join(__dirname, '.env');
console.log('\n📋 Kiểm tra file .env\n');
console.log(`Đường dẫn expected: ${envPath}`);

if (fs.existsSync(envPath)) {
    console.log('✅ File .env tồn tại');
} else {
    console.log('❌ File .env KHÔNG tồn tại!');
    process.exit(1);
}

// Load .env
require('dotenv').config({ path: envPath });

// Kiểm tra các biến
const requiredVars = ['CLIENT_ID', 'GUILD_ID'];
console.log('\n🔍 Kiểm tra các biến environment:\n');

let allLoaded = true;

// Kiểm tra Token
const token = process.env.TOKEN || process.env.DISCORD_TOKEN;
if (token) {
    const masked = token.substring(0, 10) + '***' + token.substring(token.length - 5);
    console.log(`✅ TOKEN (hoặc DISCORD_TOKEN) = ${masked}`);
} else {
    console.log('❌ TOKEN (hoặc DISCORD_TOKEN) = UNDEFINED');
    allLoaded = false;
}

// Kiểm tra MongoDB URI
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (mongoUri) {
    const masked = mongoUri.substring(0, 20) + '***' + mongoUri.substring(mongoUri.length - 10);
    console.log(`✅ MONGO_URI (hoặc MONGODB_URI) = ${masked}`);
} else {
    console.log('❌ MONGO_URI (hoặc MONGODB_URI) = UNDEFINED');
    allLoaded = false;
}

requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        console.log(`✅ ${varName} = ${value}`);
    } else {
        console.log(`❌ ${varName} = UNDEFINED`);
        allLoaded = false;
    }
});

console.log('\n' + '='.repeat(50));

if (allLoaded) {
    console.log('\n✅ Tất cả biến environment đã được load thành công!\n');
} else {
    console.log('\n❌ Một số biến environment bị thiếu!\n');
    process.exit(1);
}

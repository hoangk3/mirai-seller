/**
 * Database Connection Manager - MongoDB setup and operations
 */

const mongoose = require('mongoose');
const logger = require('./logger');
const path = require('node:path');
const fs = require('node:fs');

// Nạp .env từ thư mục gốc
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const DB = {
    /**
     * Connect to MongoDB
     */
    async connect() {
        const mongoUri = process.env.MONGO_URI;

        if (!mongoUri || mongoUri === 'undefined') {
            logger.error('MONGO_URI không được định nghĩa trong file .env');
            return false;
        }

        try {
            await mongoose.connect(mongoUri, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            logger.success('Kết nối MongoDB thành công!');
            return true;
        } catch (error) {
            logger.error('Lỗi kết nối MongoDB:', error.message);
            return false;
        }
    },

    /**
     * Disconnect from MongoDB
     */
    async disconnect() {
        try {
            await mongoose.disconnect();
            logger.success('Ngắt kết nối MongoDB thành công!');
            return true;
        } catch (error) {
            logger.error('Lỗi ngắt kết nối MongoDB:', error);
            return false;
        }
    },

    /**
     * Check connection status
     */
    isConnected() {
        return mongoose.connection.readyState === 1;
    },

    /**
     * Get connection status
     */
    getStatus() {
        const states = {
            0: 'Disconnected',
            1: 'Connected',
            2: 'Connecting',
            3: 'Disconnecting'
        };
        return states[mongoose.connection.readyState] || 'Unknown';
    }
};

module.exports = DB;

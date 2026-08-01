/**
 * UserData Schema - MongoDB Model for user transaction history
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    totalSpent: {
        type: Number,
        default: 0,
        min: 0
    },
    history: [{
        name: {
            type: String,
            required: true
        },
        price: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ['Pending', 'Hoàn tất', 'Đã hủy'],
            default: 'Pending'
        },
        date: {
            type: String,
            required: true
        },
        timestamp: {
            type: Number,
            required: false // Lưu thời điểm mua dưới dạng miliseconds
        },
        warrantyDays: {
            type: Number,
            required: false // Lưu số ngày user được bảo hành
        },
        orderId: {
            type: String,
            unique: true,
            sparse: true
        },
        _id: false
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Auto-update updatedAt before saving
userSchema.pre('save', async function () {
    this.updatedAt = Date.now();
});

userSchema.pre('findOneAndUpdate', async function () {
    this.set({ updatedAt: Date.now() });
});

const UserData = mongoose.models.UserData || mongoose.model('UserData', userSchema);

module.exports = UserData;

const mongoose = require('mongoose');

const BackupSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    guildName: { type: String },
    categories: [{
        name: String,
        position: Number,
        channels: [{
            name: String,
            type: Number,
            position: Number,
            topic: String,
            nsfw: Boolean,
            userLimit: Number,
            bitrate: Number
        }]
    }],
    loneChannels: [{
        name: String,
        type: Number,
        position: Number,
        topic: String,
        nsfw: Boolean,
        userLimit: Number,
        bitrate: Number
    }],
    roles: [{
        name: String,
        color: Number,
        hoist: Boolean,
        permissions: String,
        position: Number,
        mentionable: Boolean
    }],
    updatedAt: { type: Date, default: Date.now }
});

const BackupModel = mongoose.models.Backup || mongoose.model('Backup', BackupSchema);

module.exports = { BackupModel };

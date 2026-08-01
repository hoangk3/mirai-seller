const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    channelId: { type: String, required: true, unique: true },
    ticketId: { type: Number, required: true },
    category: { type: String, required: true },
    closed: { type: Boolean, default: false },
    locked: { type: Boolean, default: false },
    reason: { type: String, default: 'N/A' },
    ingame: { type: String, default: 'N/A' },
    thietbi: { type: String, default: 'N/A' },
    cumchoi: { type: String, default: 'N/A' },
    customFields: { type: Map, of: String },
    createdAt: { type: Date, default: Date.now }
});

const CounterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

const TicketModel = mongoose.models.Ticket || mongoose.model('Ticket', TicketSchema);
const CounterModel = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);

module.exports = { TicketModel, CounterModel };

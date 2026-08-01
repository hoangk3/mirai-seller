const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { TicketModel } = require('../../database/models/Ticket');
const { closeTicket } = require('../../utils/ticketActions');

module.exports = {
    category: 'tickets',
    data: new SlashCommandBuilder()
        .setName('close')
        .setDescription('Đóng phiếu hỗ trợ hiện tại')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction, client) {
        const ticket = await TicketModel.findOne({ channelId: interaction.channelId });

        if (!ticket) {
            return interaction.reply({
                content: 'Lệnh này chỉ có thể sử dụng trong kênh ticket.',
                flags: [MessageFlags.Ephemeral]
            });
        }

        if (ticket.closed) {
            return interaction.reply({
                content: 'Ticket này đã được đóng từ trước.',
                flags: [MessageFlags.Ephemeral]
            });
        }

        await interaction.reply('Đang đóng ticket...');
        await closeTicket(client, ticket, interaction.user.tag);
    }
};

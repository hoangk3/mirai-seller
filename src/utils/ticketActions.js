const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('./discordLogger');
const emoji = require('../../emoji.json');

async function closeTicket(client, ticket, closedBy) {
    if (ticket.closed) return false;

    ticket.closed = true;
    await ticket.save();

    const channel = await client.channels.fetch(ticket.channelId).catch(() => null);
    if (channel) {
        // Remove user permissions
        await channel.permissionOverwrites.edit(ticket.userId, {
            ViewChannel: false
        }).catch(() => null);

        const embed = new EmbedBuilder()
            .setTitle('🔒 Ticket đã đóng')
            .setDescription(`Phiếu hỗ trợ đã được đóng bởi **${closedBy}**.`)
            .setColor(0xffb6c1)
            .setTimestamp();

        const deleteButton = new ButtonBuilder()
            .setCustomId('delete_ticket')
            .setLabel('Xóa Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji(emoji.trashId || '🗑️');

        const row = new ActionRowBuilder().addComponents(deleteButton);

        await channel.send({ embeds: [embed], components: [row] });
    }

    await sendLog(
        client,
        'Ticket Closed',
        `**Executor:** ${closedBy}\n**Ticket ID:** #${ticket.ticketId}\n**Channel:** <#${ticket.channelId}>\n**Owner:** <@${ticket.userId}>`,
        0xffa500 // Orange
    );

    return true;
}

module.exports = { closeTicket };

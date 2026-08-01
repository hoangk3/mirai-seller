const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { TicketModel } = require('../../database/models/Ticket');
const emoji = require('../../../emoji.json');
const { getCategoryLabel } = require('../../utils/ticketCategories');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticketinfo')
        .setDescription('Xem thông tin chi tiết về ticket hiện tại'),

    async execute(interaction) {
        if (!interaction.guild) return;

        const ticket = await TicketModel.findOne({
            channelId: interaction.channelId,
            guildId: interaction.guild.id
        }).lean();

        if (!ticket) {
            return interaction.reply({
                content: `${emoji.error || '❌'} Kênh này không phải là một kênh hỗ trợ hợp lệ trong dữ liệu.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`🎫 Thông tin Ticket #${ticket.ticketId}`)
            .setDescription(`Thông tin chi tiết về phiếu hỗ trợ này.`)
            .setColor(0xffb6c1)
            .addFields(
                { name: 'Người tạo', value: `<@${ticket.userId}> (\`${ticket.userId}\`)`, inline: true },
                { name: 'Danh mục', value: `\`${getCategoryLabel(ticket.category)}\``, inline: true },
                { name: 'Trạng thái', value: ticket.closed ? '🔴 Đã đóng' : '🟢 Đang mở', inline: true },
                { name: 'Ngày tạo', value: `<t:${Math.floor(ticket.createdAt.getTime() / 1000)}:F>`, inline: false }
            )
            .setTimestamp();

        // Add custom fields if they exist
        const fields = [];
        if (ticket.ingame && ticket.ingame !== 'N/A')
            fields.push({ name: 'In-game', value: `\`${ticket.ingame}\``, inline: true });
        if (ticket.cumchoi && ticket.cumchoi !== 'N/A')
            fields.push({ name: 'Cụm chơi', value: `\`${ticket.cumchoi}\``, inline: true });
        if (ticket.thietbi && ticket.thietbi !== 'N/A')
            fields.push({ name: 'Thiết bị', value: `\`${ticket.thietbi}\``, inline: true });

        if (fields.length > 0) embed.addFields(fields);

        if (ticket.reason && ticket.reason !== 'N/A')
            embed.addFields({ name: 'Lý do/Nội dung', value: `\`\`\`${ticket.reason}\`\`\`` });

        return interaction.reply({ embeds: [embed] });
    }
};

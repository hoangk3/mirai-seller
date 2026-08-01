const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require('discord.js');
const { TicketModel } = require('../../database/models/Ticket');
const emoji = require('../../../emoji.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticketlist')
        .setDescription('Danh sách các ticket đang mở (Chỉ Staff)'),

    async execute(interaction, client) {
        if (!interaction.guild) return;

        const member = await interaction.guild.members.fetch(interaction.user.id);
        const isSupport = client.config.supportRoleIds?.some((roleId) => member.roles.cache.has(roleId));
        const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
        const isDev = client.config.developerIds?.includes(interaction.user.id);

        if (!isSupport && !isAdmin && !isDev) {
            return interaction.reply({
                content: `${emoji.error || '❌'} Bạn không có quyền xem danh sách ticket.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const openTickets = await TicketModel.find({
            guildId: interaction.guild.id,
            closed: false
        })
            .sort({ ticketId: 1 })
            .limit(20)
            .lean();

        if (openTickets.length === 0) {
            return interaction.reply({
                content: `${emoji.info || 'ℹ️'} Hiện không có ticket nào đang mở.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('📋 Danh sách Ticket đang mở')
            .setDescription(`Hiển thị tối đa 20 ticket mới nhất.`)
            .setColor(0xffb6c1)
            .setTimestamp();

        const ticketList = openTickets
            .map((t) => `**#${String(t.ticketId).padStart(3, '0')}** | <#${t.channelId}> | <@${t.userId}>`)
            .join('\n');

        embed.setDescription(ticketList);

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
};

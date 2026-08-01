const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('warn-list')
        .setDescription('Xem danh sách các thành viên bị cấm trong server')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction, client) {
        await interaction.deferReply({ flags: [4096] });
        const bans = await interaction.guild.bans.fetch().catch(() => null);

        if (!bans || bans.size === 0) {
            return interaction.editReply({ content: 'Server hiện không có ai bị cấm.' });
        }

        const list = bans.map(b => `• **${b.user.tag}** (${b.user.id}) | **Lý do:** ${b.reason || 'Không có'}`).join('\n');

        const embed = new EmbedBuilder()
            .setColor(client.config.colors.info)
            .setTitle(`${client.emojis_custom.DR_What} Danh sách thành viên bị cấm`)
            .setDescription(list.length > 4096 ? list.slice(0, 4093) + '...' : list)
            .setTimestamp()
            .setFooter({ text: client.config.footer });

        await interaction.editReply({ embeds: [embed] });
    },
    async messageExecute(message, args, client) {
        const bans = await message.guild.bans.fetch().catch(() => null);

        if (!bans || bans.size === 0) {
            return message.reply(`${client.emojis_custom.DR_jz} Server hiện không có ai bị cấm.`);
        }

        const list = bans.map(b => `• **${b.user.tag}** (${b.user.id}) | **Lý do:** ${b.reason || 'Không có'}`).join('\n');

        const embed = new EmbedBuilder()
            .setColor(client.config.colors.info)
            .setTitle(`${client.emojis_custom.DR_What} Danh sách thành viên bị cấm`)
            .setDescription(list.length > 4096 ? list.slice(0, 4093) + '...' : list)
            .setTimestamp()
            .setFooter({ text: client.config.footer });

        await message.reply({ embeds: [embed] });
    },
};

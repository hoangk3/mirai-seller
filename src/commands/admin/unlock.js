const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Mở khóa kênh hiện tại')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction, client) {
        await interaction.deferReply({ flags: [4096] });
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });

        const embed = new EmbedBuilder()
            .setColor(client.config.colors.success)
            .setTitle(`${client.emojis_custom.DR_hhee} 🔓 CHANNEL UNLOCKED`)
            .setDescription(`Kênh này đã được mở khóa. Các thành viên có thể tiếp tục trò chuyện!`)
            .setTimestamp()
            .setFooter({ text: client.config.footer, iconURL: client.user.displayAvatarURL() });

        await interaction.editReply({ embeds: [embed] });
    },
    async messageExecute(message, args, client) {
    },
};

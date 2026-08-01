const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Khóa kênh hiện tại')
        .addStringOption(option => option.setName('reason').setDescription('Lý do khóa'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction, client) {
        await interaction.deferReply({ flags: [4096] });
        const reason = interaction.options.getString('reason') || 'Không có lý do';

        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });

        const embed = new EmbedBuilder()
            .setColor(client.config.colors.error)
            .setTitle(`${client.emojis_custom.DR_cljz} 🔒 CHANNEL LOCKED`)
            .setDescription(`Kênh này đã bị khóa để bảo trì hoặc xử lý vi phạm.\n\n**🛡️ Moderator:** ${interaction.user.tag}\n**📄 Reason:** \`${reason}\``)
            .setTimestamp()
            .setFooter({ text: client.config.footer, iconURL: client.user.displayAvatarURL() });

        await interaction.editReply({ embeds: [embed] });
    },
    async messageExecute(message, args, client) {
        const reason = args.join(' ') || 'Không có lý do';

        await message.channel.permissionOverwrites.edit(message.guild.id, {
            SendMessages: false
        });

        const embed = new EmbedBuilder()
            .setColor(client.config.colors.error)
            .setTitle('🔒 Kênh đã bị khóa')
            .setDescription(`Kênh này đã bị khóa bởi **${message.author.tag}**.\n**Lý do:** ${reason}`)
            .setTimestamp()
            .setFooter({ text: client.config.footer });

        await message.reply({ embeds: [embed] });
    },
};

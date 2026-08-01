const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('Gỡ cách ly cho một thành viên')
        .addUserOption(option => option.setName('user').setDescription('Thành viên cần gỡ cách ly').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Lý do'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction, client) {
        await interaction.deferReply({ flags: [4096] });
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Không có lý do';

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.editReply({ content: `${client.emojis_custom.DR_jz} Không tìm thấy người này!` });

        if (!member.communicationDisabledUntilTimestamp) return interaction.editReply({ content: `${client.emojis_custom.DR_cuoi} Người này hiện không bị cách ly!` });

        await member.timeout(null, reason);

        const embed = new EmbedBuilder()
            .setColor(client.config.colors.success)
            .setTitle(`${client.emojis_custom.DR_cuoi} ✅ TIMEOUT REMOVED`)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: '👤 Target', value: `**${user.tag}**\n(\`${user.id}\`)`, inline: true },
                { name: '🛡️ Moderator', value: `**${interaction.user.tag}**`, inline: true },
                { name: '📄 Reason', value: `\`\`\`${reason}\`\`\`` }
            )
            .setTimestamp()
            .setFooter({ text: client.config.footer, iconURL: client.user.displayAvatarURL() });

        await interaction.editReply({ embeds: [embed] });
    },
    async messageExecute(message, args, client) {
        const user = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
        const reason = args.slice(1).join(' ') || 'Không có lý do';

        if (!user) return message.reply(`${client.emojis_custom.DR_What} Vui lòng tag người dùng hoặc điền ID!`);

        const member = await message.guild.members.fetch(user.id).catch(() => null);
        if (!member) return message.reply(`${client.emojis_custom.DR_jz} Không tìm thấy người này!`);

        if (!member.communicationDisabledUntilTimestamp) return message.reply(`${client.emojis_custom.DR_cuoi} Người này hiện không bị cách ly!`);

        await member.timeout(null, reason);

        const embed = new EmbedBuilder()
            .setColor(client.config.colors.success)
            .setTitle(`${client.emojis_custom.DR_cuoi} ✅ Đã gỡ cách ly`)
            .addFields(
                { name: 'Người được gỡ', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Người thực hiện', value: `${message.author.tag}`, inline: true },
                { name: 'Lý do', value: reason }
            )
            .setTimestamp()
            .setFooter({ text: client.config.footer });

        await message.reply({ embeds: [embed] });
    },
};

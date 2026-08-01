const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Sút một thành viên ra khỏi server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Thành viên cần sút')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Lý do sút'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    async execute(interaction, client) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Không có lý do';

        // Fetch member to ensure we have the most up-to-date guild member object
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: 'Không tìm thấy người này trong server!', flags: [4096] });
        if (!member.kickable) return interaction.reply({ content: 'Tôi không có quyền sút người này (có thể do họ có role cao hơn hoặc tôi thiếu quyền)!', flags: [4096] });

        await member.kick(reason);

        const embed = new EmbedBuilder()
            .setColor(client.config.colors.success)
            .setTitle(`${client.emojis_custom.DR_khinh} ✅ USER KICKED`)
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
        if (!member) return message.reply(`${client.emojis_custom.DR_jz} Không tìm thấy người này trong server!`);
        if (!member.kickable) return message.reply(`${client.emojis_custom.DR_cay} Tôi không có quyền sút người này!`);

        await member.kick(reason);

        const embed = new EmbedBuilder()
            .setColor(client.config.colors.success)
            .setTitle(`${client.emojis_custom.DR_khinh} ✅ Đã sút thành viên`)
            .addFields(
                { name: 'Người bị sút', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Người thực hiện', value: `${message.author.tag}`, inline: true },
                { name: 'Lý do', value: reason }
            )
            .setTimestamp()
            .setFooter({ text: client.config.footer });

        await message.reply({ embeds: [embed] });
    },
};

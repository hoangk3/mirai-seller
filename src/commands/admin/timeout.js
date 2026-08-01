const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Cách ly một thành viên (Mute)')
        .addUserOption(option => option.setName('user').setDescription('Thành viên cần cách ly').setRequired(true))
        .addStringOption(option => option.setName('duration').setDescription('Thời gian (1m, 1h, 1d)').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Lý do'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction, client) {
        await interaction.deferReply({ flags: [4096] });
        const user = interaction.options.getUser('user');
        const duration = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'Không có lý do';

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.editReply({ content: `${client.emojis_custom.DR_jz} Không tìm thấy người này!` });

        const timeMs = ms(duration);
        if (!timeMs || timeMs > 2419200000) return interaction.editReply({ content: `${client.emojis_custom.DR_cay} Thời gian không hợp lệ hoặc quá dài (tối đa 28 ngày)!` });

        if (!member.moderatable) return interaction.editReply({ content: `${client.emojis_custom.DR_cay} Tôi không có quyền cách ly người này!` });

        await member.timeout(timeMs, reason);

        const embed = new EmbedBuilder()
            .setColor(client.config.colors.warning)
            .setTitle(`${client.emojis_custom.DR_dongho} ⏳ USER TIMEOUT`)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: '👤 Target', value: `**${user.tag}**\n(\`${user.id}\`)`, inline: true },
                { name: '⏱️ Duration', value: `\`${duration}\``, inline: true },
                { name: '🛡️ Moderator', value: `**${interaction.user.tag}**`, inline: true },
                { name: '📄 Reason', value: `\`\`\`${reason}\`\`\`` }
            )
            .setTimestamp()
            .setFooter({ text: client.config.footer, iconURL: client.user.displayAvatarURL() });

        await interaction.editReply({ embeds: [embed] });
    },
    async messageExecute(message, args, client) {
        const user = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
        const duration = args[1];
        const reason = args.slice(2).join(' ') || 'Không có lý do';

        if (!user || !duration) return message.reply(`${client.emojis_custom.DR_What} Sử dụng: !timeout <@user/ID> <thời gian> [lý do]`);

        const member = await message.guild.members.fetch(user.id).catch(() => null);
        if (!member) return message.reply(`${client.emojis_custom.DR_jz} Không tìm thấy người này!`);

        const timeMs = ms(duration);
        if (!timeMs || timeMs > 2419200000) return message.reply(`${client.emojis_custom.DR_khonoi} Thời gian không hợp lệ!`);
        if (!member.moderatable) return message.reply(`${client.emojis_custom.DR_cay} Tôi không có quyền cách ly người này!`);

        await member.timeout(timeMs, reason);

        const embed = new EmbedBuilder()
            .setColor(client.config.colors.warning)
            .setTitle(`${client.emojis_custom.DR_dongho} ⏳ Đã cách ly thành viên`)
            .addFields(
                { name: 'Người bị cách ly', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Thời gian', value: duration, inline: true },
                { name: 'Người thực hiện', value: `${message.author.tag}`, inline: true },
                { name: 'Lý do', value: reason }
            )
            .setTimestamp()
            .setFooter({ text: client.config.footer });

        await message.reply({ embeds: [embed] });
    },
};

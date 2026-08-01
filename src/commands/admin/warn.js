const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Cảnh cáo một thành viên')
        .addUserOption(option => option.setName('user').setDescription('Thành viên cần cảnh cáo').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Lý do cảnh cáo').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction, client) {
        await interaction.deferReply({ flags: [4096] });
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');

        const warnsPath = path.join(process.cwd(), 'warns.json');
        let warns = {};
        if (fs.existsSync(warnsPath)) {
            warns = JSON.parse(fs.readFileSync(warnsPath, 'utf-8'));
        }

        if (!warns[user.id]) warns[user.id] = [];
        warns[user.id].push({
            reason,
            moderator: interaction.user.tag,
            timestamp: new Date().toISOString()
        });

        fs.writeFileSync(warnsPath, JSON.stringify(warns, null, 2));

        const embed = new EmbedBuilder()
            .setColor(client.config.colors.warning)
            .setTitle(`${client.emojis_custom.DR_suy} ⚠️ WARNING ISSUED`)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: '👤 Target', value: `**${user.tag}**\n(\`${user.id}\`)`, inline: true },
                { name: '📊 Warnings', value: `\`${warns[user.id].length}\``, inline: true },
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

        const warnsPath = require('path').join(process.cwd(), 'warns.json');
        let warns = {};
        if (fs.existsSync(warnsPath)) {
            warns = JSON.parse(fs.readFileSync(warnsPath, 'utf-8'));
        }

        if (!warns[user.id]) warns[user.id] = [];
        warns[user.id].push({
            reason: reason,
            moderator: message.author.id,
            timestamp: new Date().toISOString()
        });

        fs.writeFileSync(warnsPath, JSON.stringify(warns, null, 4));

        const embed = new EmbedBuilder()
            .setColor(client.config.colors.warning)
            .setTitle(`${client.emojis_custom.DR_suy} ⚠️ Đã cảnh cáo thành viên`)
            .addFields(
                { name: 'Người bị cảnh cáo', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Số lần vi phạm', value: `${warns[user.id].length}`, inline: true },
                { name: 'Người thực hiện', value: `${message.author.tag}`, inline: true },
                { name: 'Lý do', value: reason }
            )
            .setTimestamp()
            .setFooter({ text: client.config.footer });

        await message.reply({ embeds: [embed] });
    },
};

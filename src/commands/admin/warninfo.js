const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('warninfo')
        .setDescription('Xem danh sách cảnh cáo của một thành viên')
        .addUserOption(option => option.setName('user').setDescription('Thành viên cần xem').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction, client) {
        await interaction.deferReply({ flags: [4096] });
        const user = interaction.options.getUser('user');

        const warnsPath = path.join(process.cwd(), 'warns.json');
        let userWarns = [];
        if (fs.existsSync(warnsPath)) {
            const warns = JSON.parse(fs.readFileSync(warnsPath, 'utf-8'));
            userWarns = warns[user.id] || [];
        }

        if (userWarns.length === 0) {
            const embedClean = new EmbedBuilder()
                .setColor(client.config.colors.success)
                .setTitle(`${client.emojis_custom.DR_Hehe} 🛡️ USER STATUS: CLEAN`)
                .setDescription(`${client.emojis_custom.DR_khinh} Thành viên **${user.tag}** hiện chưa có bất kỳ cảnh cáo nào!`)
                .setThumbnail(user.displayAvatarURL())
                .setFooter({ text: client.config.footer });
            return interaction.editReply({ embeds: [embedClean] });
        }

        const embed = new EmbedBuilder()
            .setColor(client.config.colors.warning)
            .setTitle(`${client.emojis_custom.DR_suy} ⚠️ WARNING DATA: ${user.username.toUpperCase()}`)
            .setThumbnail(user.displayAvatarURL())
            .setDescription(userWarns.map((w, i) => `**#${i + 1}** | \`${w.reason}\`\nBy: <@${w.moderator}> • <t:${Math.floor(new Date(w.timestamp).getTime() / 1000)}:R>`).join('\n\n'))
            .setFooter({ text: `Tổng cộng: ${userWarns.length} lần vi phạm`, iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
    async messageExecute(message, args, client) {
        const user = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
        if (!user) return message.reply(`${client.emojis_custom.DR_What} Vui lòng tag người dùng hoặc điền ID!`);

        const warnsPath = path.join(process.cwd(), 'warns.json');
        let userWarns = [];
        if (fs.existsSync(warnsPath)) {
            const warns = JSON.parse(fs.readFileSync(warnsPath, 'utf-8'));
            userWarns = warns[user.id] || [];
        }

        if (userWarns.length === 0) {
            return message.reply(`${client.emojis_custom.DR_cuoi} Thành viên **${user.tag}** hiện tại rất trong sạch!`);
        }

        const embed = new EmbedBuilder()
            .setColor(client.config.colors.warning)
            .setTitle(`${client.emojis_custom.DR_suy} Danh sách cảnh cáo: ${user.tag}`)
            .setDescription(userWarns.map((w, i) => `**${i + 1}.** ${w.reason} (By: <@${w.moderator}>)`).join('\n'))
            .setFooter({ text: `Tổng cộng: ${userWarns.length} lần vi phạm` })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    },
};

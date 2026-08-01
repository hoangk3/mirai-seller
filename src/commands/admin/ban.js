const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Cấm một thành viên khỏi server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Thành viên cần cấm')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Lý do cấm'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction, client) {
        await interaction.deferReply({ flags: [4096] });
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Không có lý do';

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (member && !member.bannable) return interaction.editReply({ content: `${client.emojis_custom.DR_cay} Tôi không có quyền cấm người này!` });

        await interaction.guild.members.ban(user, { reason });

        // Save to bans.json
        const bansPath = path.join(process.cwd(), 'bans.json');
        let bans = {};
        if (fs.existsSync(bansPath)) bans = JSON.parse(fs.readFileSync(bansPath, 'utf-8'));

        if (!bans[user.id]) bans[user.id] = [];
        bans[user.id].push({
            reason,
            moderator: interaction.user.id,
            timestamp: new Date().toISOString()
        });
        fs.writeFileSync(bansPath, JSON.stringify(bans, null, 2));

        const embed = new EmbedBuilder()
            .setColor(client.config.colors.error)
            .setTitle(`${client.emojis_custom.DR_cay} 🔨 BANNED SUCCESSFUL`)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: `👤 Target`, value: `**${user.tag}**\n(\`${user.id}\`)`, inline: true },
                { name: `🛡️ Moderator`, value: `**${interaction.user.tag}**`, inline: true },
                { name: `📄 Reason`, value: `\`\`\`${reason}\`\`\`` }
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
        if (member && !member.bannable) return message.reply(`${client.emojis_custom.DR_cay} Tôi không có quyền cấm người này!`);

        await message.guild.members.ban(user, { reason });

        const embed = new EmbedBuilder()
            .setColor(client.config.colors.error)
            .setTitle(`${client.emojis_custom.DR_cay} 🔨 Đã cấm thành viên`)
            .addFields(
                { name: 'Người bị cấm', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Người thực hiện', value: `${message.author.tag}`, inline: true },
                { name: 'Lý do', value: reason }
            )
            .setTimestamp()
            .setFooter({ text: client.config.footer });

        await message.reply({ embeds: [embed] });
    },
};

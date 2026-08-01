const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Gỡ cấm cho một người dùng bằng ID')
        .addStringOption(option => option.setName('userid').setDescription('ID người dùng cần gỡ cấm').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Lý do gỡ cấm'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction, client) {
        await interaction.deferReply({ flags: [4096] });
        const userId = interaction.options.getString('userid');
        const reason = interaction.options.getString('reason') || 'Không có lý do';

        try {
            await interaction.guild.members.unban(userId, reason);

            // Update bans.json (remove or mark as unbanned)
            const bansPath = path.join(process.cwd(), 'bans.json');
            if (fs.existsSync(bansPath)) {
                let bansData = JSON.parse(fs.readFileSync(bansPath, 'utf-8'));
                if (bansData[userId]) {
                    delete bansData[userId]; // In this simple system, we just remove the record
                    fs.writeFileSync(bansPath, JSON.stringify(bansData, null, 2));
                }
            }

            const embed = new EmbedBuilder()
                .setColor(client.config.colors.success)
                .setTitle(`${client.emojis_custom.DR_Hehe} ✅ UNBAN SUCCESSFUL`)
                .setDescription(`Đã gỡ cấm cho người dùng có ID: **${userId}**`)
                .addFields({ name: '🛡️ Moderator', value: interaction.user.tag, inline: true }, { name: '📄 Reason', value: reason, inline: true })
                .setTimestamp()
                .setFooter({ text: client.config.footer, iconURL: client.user.displayAvatarURL() });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: `${client.emojis_custom.DR_What} Không thể gỡ cấm cho ID này. Có thể ID không hợp lệ hoặc người này không bị cấm.` });
        }
    },
    async messageExecute(message, args, client) {
        const userId = args[0];
        const reason = args.slice(1).join(' ') || 'Không có lý do';

        if (!userId) return message.reply(`${client.emojis_custom.DR_What} Vui lòng cung cấp ID người dùng!`);

        try {
            await message.guild.members.unban(userId);

            const embed = new EmbedBuilder()
                .setColor(client.config.colors.success)
                .setTitle(`${client.emojis_custom.DR_Hehe} ✅ Đã gỡ cấm`)
                .setDescription(`Đã gỡ cấm cho người dùng có ID: **${userId}**`)
                .setTimestamp()
                .setFooter({ text: client.config.footer });

            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await message.reply(`${client.emojis_custom.DR_What} Không thể gỡ cấm cho ID này. Có thể ID không hợp lệ hoặc người này không bị cấm.`);
        }
    },
};

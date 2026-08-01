const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Xóa số lượng tin nhắn chỉ định')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Số lượng tin nhắn cần xóa (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction, client) {
        const amount = interaction.options.getInteger('amount');

        await interaction.channel.bulkDelete(amount, true).then(messages => {
            const embed = new EmbedBuilder()
                .setColor(client.config.colors.success)
                .setTitle(`${client.emojis_custom.DR_Clean} CLEANUP SUCCESS`)
                .setDescription(`✅ Đã xóa sạch **${messages.size}** tin nhắn khỏi kênh này!`)
                .setTimestamp()
                .setFooter({ text: client.config.footer, iconURL: client.user.displayAvatarURL() });

            interaction.reply({ embeds: [embed], flags: [4096] });
        }).catch(err => {
            console.error(err);
            interaction.reply({ content: `${client.emojis_custom.DR_wtf} Có lỗi xảy ra khi xóa tin nhắn!`, flags: [4096] });
        });
    },
    async messageExecute(message, args, client) {
        const amount = parseInt(args[0]);

        if (isNaN(amount) || amount < 1 || amount > 100) {
            return message.reply(`${client.emojis_custom.DR_jz} Vui lòng nhập số tin nhắn cần xóa (1-100)!`);
        }

        // Delete the command message first
        await message.delete().catch(() => null);

        await message.channel.bulkDelete(amount, true).then(messages => {
            const embed = new EmbedBuilder()
                .setColor(client.config.colors.success)
                .setTitle(`${client.emojis_custom.DR_Clean} CLEANUP SUCCESS`)
                .setDescription(`✅ Đã xóa sạch **${messages.size}** tin nhắn khỏi kênh này!`)
                .setTimestamp()
                .setFooter({ text: client.config.footer, iconURL: client.user.displayAvatarURL() });

            message.channel.send({ embeds: [embed] }).then(msg => {
                setTimeout(() => msg.delete().catch(() => null), 5000);
            });
        }).catch(err => {
            console.error(err);
            message.channel.send(`${client.emojis_custom.DR_wtf} Có lỗi xảy ra khi xóa tin nhắn!`).then(m => setTimeout(() => m.delete().catch(() => null), 5000));
        });
    },
};

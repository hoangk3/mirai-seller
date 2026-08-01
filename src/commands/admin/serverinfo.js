const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Xem thông tin chi tiết về server'),
    async execute(interaction, client) {
        await interaction.deferReply({ flags: [4096] });
        const { guild } = interaction;

        const embed = new EmbedBuilder()
            .setColor(client.config.colors.info)
            .setTitle(`${client.emojis_custom.DR_Star} SERVER INFORMATION: ${guild.name.toUpperCase()}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
            .addFields(
                { name: `🏰 Name`, value: `**${guild.name}**`, inline: true },
                { name: `🆔 ID`, value: `\`${guild.id}\``, inline: true },
                { name: `👑 Owner`, value: `<@${guild.ownerId}>`, inline: true },
                { name: `👥 Members`, value: `\`${guild.memberCount}\``, inline: true },
                { name: `📅 Created At`, value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:f>`, inline: true },
                { name: `🚀 Boosts`, value: `\`${guild.premiumSubscriptionCount}\``, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: client.config.footer, iconURL: client.user.displayAvatarURL() });

        await interaction.editReply({ embeds: [embed] });
    },
};

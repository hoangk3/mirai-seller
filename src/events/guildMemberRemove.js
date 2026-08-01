const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member, client) {
        const logChannelId = client.config.logChannelId;
        if (!logChannelId) return;

        const channel = member.guild.channels.cache.get(logChannelId);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setColor(client.config.colors.error)
            .setTitle('🚪 Thành viên đã rời đi')
            .setDescription(`**${member.user.tag}** đã rời khỏi server.`)
            .setThumbnail(member.user.displayAvatarURL())
            .addFields(
                { name: 'ID', value: member.id, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: client.config.footer });

        channel.send({ embeds: [embed] });
    },
};

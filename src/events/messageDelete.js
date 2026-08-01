const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config/discord-config');

module.exports = {
    name: Events.MessageDelete,
    async execute(message, client) {
        // Log deleted message from DOTTIE_MANAGER
        if (message.partial || message.author?.bot) return;

        const logChannelId = message.client.config?.logChannelId;
        if (!logChannelId) return;

        const logChannel = message.guild?.channels.cache.get(logChannelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor(message.client.config?.colors?.warning || 0xf1c40f)
            .setTitle('🗑️ Tin nhắn đã bị xóa')
            .addFields(
                { name: 'Người gửi', value: `${message.author.tag} (${message.author.id})`, inline: true },
                { name: 'Kênh', value: `${message.channel}`, inline: true },
                { name: 'Nội dung', value: message.content || '*Không có nội dung (có thể là ảnh hoặc embed)*' }
            )
            .setTimestamp()
            .setFooter({ text: message.client.config?.footer || 'Dottie Inc' });

        await logChannel.send({ embeds: [embed] }).catch(() => {});
    },
};

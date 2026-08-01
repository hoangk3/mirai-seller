const { EmbedBuilder } = require('discord.js');

async function sendLog(client, title, description, color = 0x3498db) {
    const logChannelId = client.config.logChannelId;
    if (!logChannelId || logChannelId === 'ID_KENH_LOG_CUA_BAN') return;

    const channel = await client.channels.fetch(logChannelId).catch(() => null);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => null);
}

module.exports = { sendLog };

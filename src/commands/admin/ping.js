const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Kiểm tra độ trễ của bot'),
    async execute(interaction, client) {
        await interaction.reply({ content: `${client.emojis_custom.DR_dongho} 🏓 Pong! \`${client.ws.ping}ms\`` });
        setTimeout(() => interaction.deleteReply().catch(() => null), 5000);
    },
    async messageExecute(message, args, client) {
        const msg = await message.reply(`${client.emojis_custom.DR_dongho} 🏓 Pong! \`${client.ws.ping}ms\``);
        setTimeout(() => {
            msg.delete().catch(() => null);
            message.delete().catch(() => null);
        }, 5000);
    },
};

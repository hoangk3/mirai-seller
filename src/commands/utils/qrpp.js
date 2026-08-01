const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');
const config = require('../../config/discord-config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('qrpp')
        .setDescription('Hiển thị mã QR của Puppy'),

    // Prefix command support
    name: 'qrpp',
    description: 'Hiển thị mã QR của Puppy',

    async execute(interactionOrMessage) {
        const isInteraction = interactionOrMessage.isChatInputCommand?.() || interactionOrMessage.isCommand?.();
        try {
            const filePath = path.join(__dirname, '../../img/pp.png');
            const attachment = new AttachmentBuilder(filePath);
            const response = {
                content: `💳 **Mã QR Puppy - Dottie Inc**`,
                files: [attachment]
            };
            if (isInteraction) {
                await interactionOrMessage.reply(response);
            } else {
                await interactionOrMessage.reply(response);
            }
        } catch (error) {
            const errorMsg = `❌ Không tìm thấy file pp.png!`;
            if (isInteraction) {
                await interactionOrMessage.reply({ content: errorMsg, ephemeral: true });
            } else {
                await interactionOrMessage.reply(errorMsg);
            }
        }
    }
};

const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');
const config = require('../../config/discord-config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('qrloi')
        .setDescription('Hiển thị mã QR báo lỗi'),
    
    // Prefix command support
    name: 'qrloi',
    description: 'Hiển thị mã QR báo lỗi',
    
    async execute(interactionOrMessage) {
        const isInteraction = interactionOrMessage.isChatInputCommand?.() || interactionOrMessage.isCommand?.();
        
        try {
            const filePath = path.join(__dirname, '../../img/loiqr.png');
            const attachment = new AttachmentBuilder(filePath);
            
            const response = {
                content: `💳 **Mã QR Báo lỗi - Dottie Inc**`,
                files: [attachment]
            };

            if (isInteraction) {
                await interactionOrMessage.reply(response);
            } else {
                await interactionOrMessage.reply(response);
            }
        } catch (error) {
            const errorMsg = `❌ Không tìm thấy file loiqr.png!`;
            if (isInteraction) {
                await interactionOrMessage.reply({ content: errorMsg, ephemeral: true });
            } else {
                await interactionOrMessage.reply(errorMsg);
            }
        }
    }
};

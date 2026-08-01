const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../../config/discord-config');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('math')
        .setDescription('Tính toán biểu thức toán học (cộng, trừ, nhân, chia, phần trăm)')
        .addStringOption(option =>
            option.setName('bieu_thuc')
                .setDescription('Biểu thức cần tính (vd: 10 + 20 * 5, 10% * 200)')
                .setRequired(true)),

    name: 'math',
    description: 'Tính toán biểu thức toán học',
    aliases: ['tinh', 'calc', 'm'],

    async execute(interactionOrMessage, args) {
        const isInteraction = interactionOrMessage.isChatInputCommand?.();
        let expression = '';

        if (isInteraction) {
            expression = interactionOrMessage.options.getString('bieu_thuc');
        } else {
            if (!args || args.length === 0) {
                return interactionOrMessage.reply(`${config.EMOJIS.CROSS || '❌'} Vui lòng nhập biểu thức! Ví dụ: \`${config.PREFIX}math 100 + 50\``);
            }
            expression = args.join(' ');
        }

        try {
            // Làm sạch biểu thức
            // Thay thế 'x' bằng '*', ':' bằng '/'
            let cleanExpression = expression.toLowerCase()
                .replace(/x/g, '*')
                .replace(/:/g, '/')
                .replace(/,/g, '.') // Thay dấu phẩy thập phân bằng dấu chấm
                .replace(/%/g, '/100'); // Thay % bằng /100

            // Kiểm tra tính an toàn (Chỉ cho phép số và các toán tử toán học cơ bản)
            if (!/^[0-9+\-*/().\s]+$/.test(cleanExpression)) {
                const errorMsg = `${config.EMOJIS.CROSS || '❌'} Biểu thức chứa ký tự không hợp lệ! Chỉ cho phép số và các toán tử \`+ - * / ( ) %\``;
                if (isInteraction) {
                    return interactionOrMessage.reply({ content: errorMsg, flags: [MessageFlags.Ephemeral] });
                } else {
                    return interactionOrMessage.reply(errorMsg);
                }
            }

            // Tính toán
            // Sử dụng Function thay vì eval để an toàn hơn một chút (dù đã được lọc regex bên trên)
            const result = new Function(`return ${cleanExpression}`)();

            if (result === Infinity || isNaN(result)) {
                throw new Error('Kết quả không xác định');
            }

            const embed = new EmbedBuilder()
                .setColor(config.COLORS.PRIMARY)
                .setTitle(`${config.EMOJIS.SETTING || '⚙️'} MÁY TÍNH DOTTIE`)
                .addFields(
                    { name: '📝 Biểu thức', value: `\`\`\`\n${expression}\n\`\`\`` },
                    { name: '✅ Kết quả', value: `> **${result.toLocaleString('vi-VN')}**` }
                )
                .setFooter({ text: 'Dottie Inc - Tính toán nhanh chóng' })
                .setTimestamp();

            if (isInteraction) {
                await interactionOrMessage.reply({ embeds: [embed] });
            } else {
                await interactionOrMessage.reply({ embeds: [embed] });
            }

        } catch (error) {
            logger.error(`Lỗi tính toán (${expression}):`, error.message);
            const errorMsg = `${config.EMOJIS.CROSS || '❌'} Lỗi tính toán: Biểu thức không hợp lệ!`;
            if (isInteraction) {
                await interactionOrMessage.reply({ content: errorMsg, flags: [MessageFlags.Ephemeral] });
            } else {
                await interactionOrMessage.reply(errorMsg);
            }
        }
    }
};

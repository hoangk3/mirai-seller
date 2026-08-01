const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../../config/discord-config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ahelp')
        .setDescription('Xem danh sách tất cả các lệnh quản trị của bot (Admin Only)'),

    name: 'ahelp',
    description: 'Xem trợ giúp dành cho Quản trị viên (Admin only)',
    aliases: ['adminhelp', 'modhelp'],

    async execute(interactionOrMessage) {
        const isInteraction = interactionOrMessage.isChatInputCommand?.();
        const client = interactionOrMessage.client;
        const prefix = config.PREFIX;
        const member = isInteraction ? interactionOrMessage.member : interactionOrMessage.member;

        // Check explicit permissions or configured admin roles here
        const hasAdminPermission = member.permissions.has(PermissionsBitField.Flags.Administrator) ||
                                 member.roles.cache.has(config.ROLES.SUPPORT);
        
        if (!hasAdminPermission) {
            const replyContent = "❌ Bạn không có quyền sử dụng lệnh này.";
            if (isInteraction) return interactionOrMessage.reply({ content: replyContent, flags: [4096] }); // Ephemeral
            return interactionOrMessage.reply(replyContent);
        }

        const embed = new EmbedBuilder()
            .setColor(config.COLORS.ERROR) // Assuming ERROR is red, fits for admin commands
            .setTitle(`🛡️ DANH SÁCH LỆNH QUẢN TRỊ VIÊN`)
            .setDescription(`Xin chào Admin ${member}! Dưới đây là các lệnh dành riêng cho quản lý hệ thống.`)
            .setThumbnail(client.user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: 'Dottie Inc - Hệ thống Admin', iconURL: client.user.displayAvatarURL() });

        const adminCommands = [];
        
        // Liệt kê các lệnh cụ thể dành cho admin
        const ADMIN_ONLY_COMMANDS = ['resetdata', 'addmoney', 'setstatus', 'ahelp'];

        const allCommands = new Map();

        client.commands.forEach(cmd => {
            allCommands.set(cmd.data.name, {
                name: cmd.data.name,
                description: cmd.data.description,
                type: 'slash'
            });
        });

        client.prefixCommands.forEach(cmd => {
            if (allCommands.has(cmd.name)) {
                allCommands.get(cmd.name).type = 'both';
            } else {
                allCommands.set(cmd.name, {
                    name: cmd.name,
                    description: cmd.description || 'Không có mô tả',
                    type: 'prefix'
                });
            }
        });

        allCommands.forEach(cmd => {
            const cmdName = cmd.name;
            const cmdDesc = cmd.description;
            const cmdType = cmd.type === 'both' ? '(/, !)' : (cmd.type === 'slash' ? '(/)' : '(!)');

            // Chỉ hiển thị các lệnh admin
            if (ADMIN_ONLY_COMMANDS.includes(cmdName)) {
                adminCommands.push(`\`${cmdName}\` ${cmdType}: ${cmdDesc}`);
            }
        });

        if (adminCommands.length > 0) {
            embed.addFields({ name: `🛠️ Lệnh Quản Trị`, value: adminCommands.join('\n') });
        } else {
            embed.addFields({ name: `🛠️ Lệnh Quản Trị`, value: "Chưa có lệnh quản trị nào được tải." });
        }

        // Cũng có thể hiển thị tất cả các lệnh của bot cho Admin dễ quản lý (tùy chọn)

        const response = { embeds: [embed] };

        if (isInteraction) {
            await interactionOrMessage.reply(response);
        } else {
            await interactionOrMessage.reply(response);
        }
    }
};

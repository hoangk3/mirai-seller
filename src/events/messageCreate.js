const { Events, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../config/discord-config');
const logger = require('../utils/logger');

module.exports = {
    name: Events.MessageCreate,
    once: false,
    async execute(message, client) {
        // Bỏ qua tin nhắn của bot hoặc ngoài máy chủ
        if (message.author.bot || !message.guild) return;

        // Lấy prefix từ cấu hình (ưu tiên cấu hình động của client)
        const prefix = client.config?.prefix || config.PREFIX || '!';
        
        // Kiểm tra xem tin nhắn có bắt đầu bằng prefix không
        if (!message.content.startsWith(prefix)) return;

        // Phân tách lệnh và tham số
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        // Kiểm tra xem bộ sưu tập lệnh prefix đã được khởi tạo chưa
        if (!client.prefixCommands) return;

        // Lấy lệnh từ Collection
        const command = client.prefixCommands.get(commandName);
        if (!command) return;

        // Kiểm tra quyền hạn sử dụng lệnh theo Role (giống cấu hình ở interactionCreate)
        const MEMBER_ROLE = '1380900663726182431';
        const STAFF_ROLE = '1517899422225399848';
        const ALLOWED_MEMBER_COMMANDS = ['serverinfo', 'help', 'me', 'topcash', 'math', 'qrhuy', 'qrloi', 'qrluz', 'pin'];

        const member = message.member;
        if (member) {
            const memberRoles = member.roles.cache;
            const isMember = memberRoles.has(MEMBER_ROLE);
            const isStaff = memberRoles.has(STAFF_ROLE) || member.permissions.has(PermissionFlagsBits.Administrator);
            const isMemberCommand = ALLOWED_MEMBER_COMMANDS.includes(commandName);

            if (isMemberCommand) {
                if (!isMember && !isStaff) {
                    return message.reply(`${config.EMOJIS?.DR_CROSS || config.EMOJIS?.CROSS || "❌"} Bạn không có quyền sử dụng lệnh này!`).catch(() => {});
                }
            } else {
                if (!isStaff) {
                    return message.reply(`${config.EMOJIS?.DR_CROSS || config.EMOJIS?.CROSS || "❌"} Bạn không có quyền sử dụng lệnh này!`).catch(() => {});
                }
            }
        }

        // Gửi log sử dụng lệnh Admin (giống interactionCreate)
        const isMemberCommand = ALLOWED_MEMBER_COMMANDS.includes(commandName);
        if (!isMemberCommand) {
            const logChannelId = client.config?.logChannelId || config.CHANNELS?.LOG || '1519187835192606912';
            const logChannel = client.channels.cache.get(logChannelId) || await client.channels.fetch(logChannelId).catch(() => null);
            if (logChannel) {
                const argsStr = args.join(' ') || 'Không có';
                const logEmbed = new EmbedBuilder()
                    .setTitle('🛡️ Lệnh Prefix Admin được sử dụng')
                    .setColor('#e74c3c')
                    .addFields(
                        { name: 'Người dùng', value: `${message.author.tag} (${message.author.id})`, inline: true },
                        { name: 'Kênh', value: `${message.channel.name} (${message.channel.id})`, inline: true },
                        { name: 'Lệnh', value: `\`${prefix}${commandName}\``, inline: true },
                        { name: 'Tham số', value: `\`\`\`${argsStr}\`\`\`` }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
            }
        }

        try {
            // Chạy lệnh dựa trên kiểu thiết kế lệnh (Dottie Manager vs Dottie Service)
            if (typeof command.messageExecute === 'function') {
                await command.messageExecute(message, args, client);
            } else if (typeof command.execute === 'function') {
                await command.execute(message, args);
            }
        } catch (error) {
            logger.error(`Lỗi thực thi lệnh prefix ${commandName}:`, error);
            await message.reply(`${config.EMOJIS?.DR_CROSS || config.EMOJIS?.CROSS || '❌'} Có lỗi xảy ra khi thực thi lệnh!`).catch(() => {});
        }
    }
};

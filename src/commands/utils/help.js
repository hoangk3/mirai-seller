const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/discord-config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Xem danh sách tất cả các lệnh của bot'),

    name: 'help',
    description: 'Xem danh sách tất cả các lệnh của bot',
    aliases: ['h', 'commands'],

    async execute(interactionOrMessage) {
        const isInteraction = interactionOrMessage.isChatInputCommand?.() || interactionOrMessage.isCommand?.();
        const client = interactionOrMessage.client;
        const prefix = config.PREFIX || '!';

        // Custom emoji fallback helper
        const getEmoji = (name, fallback) => {
            if (client.emojis_custom && client.emojis_custom[name]) return client.emojis_custom[name];
            if (config.EMOJIS && config.EMOJIS[name]) return config.EMOJIS[name];
            return fallback;
        };

        const embed = new EmbedBuilder()
            .setColor(config.COLORS?.PRIMARY || '#8b5f8f')
            .setTitle(`${getEmoji('DR_Doro', 'ℹ️')} DANH SÁCH LỆNH BOT DOTTIE`)
            .setDescription(`Sử dụng \`${prefix}tên_lệnh\` hoặc \`/\` để dùng các lệnh dưới đây.`)
            .setThumbnail(client.user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: 'DOTTIE COMMUNITY - Hệ thống quản lý & hỗ trợ', iconURL: client.user.displayAvatarURL() });

        // Get unique commands
        const allCommands = new Map();

        client.commands.forEach(cmd => {
            allCommands.set(cmd.data.name, {
                name: cmd.data.name,
                description: cmd.data.description,
                category: cmd.category || 'General',
                type: 'slash',
                original: cmd
            });
        });

        client.prefixCommands.forEach(cmd => {
            const name = cmd.name || cmd.data?.name;
            if (!name) return;

            const existing = allCommands.get(name);
            if (existing) {
                existing.type = 'both';
                if (!existing.category && cmd.category) {
                    existing.category = cmd.category;
                }
            } else {
                allCommands.set(name, {
                    name: name,
                    description: cmd.description || cmd.data?.description || 'Không có mô tả',
                    category: cmd.category || 'General',
                    type: 'prefix',
                    original: cmd
                });
            }
        });

        // Lọc danh sách lệnh hiển thị theo Role
        const member = interactionOrMessage.member;
        const memberRoles = member?.roles?.cache;
        const MEMBER_ROLE = '1380900663726182431';
        const STAFF_ROLE = '1517899422225399848';
        const ALLOWED_MEMBER_COMMANDS = ['serverinfo', 'help', 'me', 'topcash', 'math', 'qrhuy', 'qrloi', 'qrluz', 'pin'];
        const isStaff = memberRoles?.has(STAFF_ROLE) || member?.permissions.has(PermissionFlagsBits.Administrator);

        if (!isStaff) {
            for (const name of allCommands.keys()) {
                if (!ALLOWED_MEMBER_COMMANDS.includes(name.toLowerCase())) {
                    allCommands.delete(name);
                }
            }
        }

        // Group by category
        const categories = {
            moderation: [],
            tickets: [],
            giveaways: [],
            work: [],
            utility: []
        };

        const categoryLabels = {
            moderation: `${getEmoji('DR_jz', '🛡️')} QUẢN TRỊ (MODERATION)`,
            tickets: `${getEmoji('DR_ticket', '🎫')} PHIẾU HỖ TRỢ (TICKETS)`,
            giveaways: `${getEmoji('DR_Star', '🎉')} QUÀ TẶNG (GIVEAWAYS)`,
            work: `${getEmoji('DR_shopping', '🛒')} CỬA HÀNG & DỊCH VỤ (WORK)`,
            utility: `${getEmoji('DR_setting', '⚙️')} TIỆN ÍCH (UTILITY)`
        };

        allCommands.forEach(cmd => {
            // Bỏ qua chính lệnh help và ahelp trong danh sách chung (sẽ được tự hiển thị)
            if (cmd.name === 'help') return;

            const cmdType = cmd.type === 'both' ? '(/, !)' : (cmd.type === 'slash' ? '(/)' : '(!)');
            const cmdString = `\`${cmd.name}\` ${cmdType}: ${cmd.description}`;
            
            const cat = cmd.category?.toLowerCase() || 'utility';
            if (categories[cat]) {
                categories[cat].push(cmdString);
            } else {
                if (!categories['utility']) categories['utility'] = [];
                categories['utility'].push(cmdString);
            }
        });

        // Add fields to embed, split if exceeds 1024 chars per field
        for (const [key, list] of Object.entries(categories)) {
            if (list.length > 0) {
                const fieldName = categoryLabels[key] || key.toUpperCase();
                let chunk = '';
                for (const cmdStr of list) {
                    if ((chunk + cmdStr + '\n').length > 1024) {
                        embed.addFields({ name: fieldName, value: chunk.trimEnd() });
                        chunk = '';
                    }
                    chunk += `${cmdStr}\n`;
                }
                if (chunk) embed.addFields({ name: fieldName, value: chunk.trimEnd() });
            }
        } const response = { embeds: [embed] };

        if (isInteraction) {
            await interactionOrMessage.reply(response);
        } else {
            await interactionOrMessage.reply(response);
        }
    }
};

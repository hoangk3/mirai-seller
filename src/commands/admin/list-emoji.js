const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// Đường dẫn tới file emoji.json
const EMOJI_JSON_PATH = path.join(__dirname, '..', '..', '..', 'emoji.json');

/**
 * Lấy emoji từ guild và tự động cập nhật emoji.json với ID mới nhất và xóa các emoji không còn trong server.
 * @param {import('discord.js').Guild} guild
 * @param {Object} currentEmojiData - Dữ liệu emoji hiện tại từ client
 * @returns {{ emojis: string[], updated: boolean }}
 */
async function fetchAndSyncEmojis(guild, currentEmojiData) {
    // Fetch toàn bộ emoji từ guild Discord (luôn có ID chính xác)
    const guildEmojis = await guild.emojis.fetch();

    if (!guildEmojis || guildEmojis.size === 0) {
        // Không có emoji trên guild → dùng dữ liệu cũ từ JSON
        const emojis = Object.entries(currentEmojiData).map(([name, value], index) => {
            return `#${index + 1}. ${value} - \`${value}\``;
        });
        return { emojis, updated: false };
    }

    // Xây dựng map tên → chuỗi emoji mới từ guild
    const newEmojiMap = {};
    guildEmojis.forEach(emoji => {
        const emojiStr = emoji.animated
            ? `<a:${emoji.name}:${emoji.id}>`
            : `<:${emoji.name}:${emoji.id}>`;
        newEmojiMap[emoji.name] = emojiStr;
    });

    // So sánh với dữ liệu cũ và phát hiện thay đổi cũng như việc xóa
    let hasChanges = false;
    const mergedMap = {};

    // Thêm hoặc cập nhật emoji hiện có trong server
    for (const [name, newValue] of Object.entries(newEmojiMap)) {
        if (currentEmojiData[name] !== newValue) {
            hasChanges = true;
        }
        mergedMap[name] = newValue;
    }

    // Xóa các emoji không còn trong server
    for (const name of Object.keys(currentEmojiData)) {
        if (!newEmojiMap.hasOwnProperty(name)) {
            hasChanges = true; // có thay đổi do xóa
        }
    }

    // Nếu có thay đổi → ghi đè emoji.json với dữ liệu mới (sau khi đã loại bỏ missing)
    if (hasChanges) {
        try {
            fs.writeFileSync(EMOJI_JSON_PATH, JSON.stringify(mergedMap, null, 4), 'utf-8');
        } catch (err) {
            console.error('[list-emoji] Không thể cập nhật emoji.json:', err.message);
        }
    }

    // Tạo danh sách hiển thị: #1. <name:id> - `<name:id>`
    const emojis = Object.entries(mergedMap).map(([name, value], index) => {
        return `#${index + 1}. ${value} - \`${value}\``;
    });

    return { emojis, updated: hasChanges };
}

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('list-emoji')
        .setDescription('Liệt kê tất cả emoji tùy chỉnh của server (tự động cập nhật ID)'),
    async execute(interaction, client) {
        await interaction.deferReply();

        const guild = interaction.guild;
        if (!guild) {
            return interaction.editReply({ content: '❌ Lệnh này chỉ dùng được trong server!' });
        }

        const emojiData = client.emojis_custom;
        const { emojis, updated } = await fetchAndSyncEmojis(guild, emojiData || {});

        // Cập nhật lại client nếu có thay đổi
        if (updated) {
            try {
                client.emojis_custom = JSON.parse(fs.readFileSync(EMOJI_JSON_PATH, 'utf-8'));
            } catch { /* bỏ qua lỗi đọc file */ }
        }

        if (emojis.length === 0) {
            return interaction.editReply({ content: '❌ Không có emoji tùy chỉnh nào trên server!' });
        }

        const itemsPerPage = 20;
        const totalPages = Math.ceil(emojis.length / itemsPerPage);
        let currentPage = 0;

        const generateEmbed = (page) => {
            const start = page * itemsPerPage;
            const end = start + itemsPerPage;
            const currentItems = emojis.slice(start, end);

            return new EmbedBuilder()
                .setColor(client.config.colors.info)
                .setTitle(`🎭 Danh sách Emoji – ${emojis.length} emoji${updated ? ' *(đã cập nhật ID)*' : ''}`)
                .setDescription(currentItems.join('\n'))
                .setFooter({ text: `Trang ${page + 1}/${totalPages} • ID được lấy trực tiếp từ server` })
                .setTimestamp();
        };

        const generateButtons = (page) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('first')
                    .setEmoji('⏪')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setEmoji('⬅️')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('delete')
                    .setEmoji('🗑️')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setEmoji('➡️')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(page === totalPages - 1),
                new ButtonBuilder()
                    .setCustomId('last')
                    .setEmoji('⏩')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === totalPages - 1)
            );
        };

        const response = await interaction.editReply({
            embeds: [generateEmbed(currentPage)],
            components: [generateButtons(currentPage)]
        });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'Bạn không thể sử dụng bảng điều khiển này!', ephemeral: true });
            }

            if (i.customId === 'first') currentPage = 0;
            else if (i.customId === 'prev') currentPage--;
            else if (i.customId === 'next') currentPage++;
            else if (i.customId === 'last') currentPage = totalPages - 1;
            else if (i.customId === 'delete') {
                return await interaction.deleteReply();
            }

            await i.update({
                embeds: [generateEmbed(currentPage)],
                components: [generateButtons(currentPage)]
            });
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => null);
        });
    },
    async messageExecute(message, args, client) {
        const guild = message.guild;
        if (!guild) {
            return message.reply('❌ Lệnh này chỉ dùng được trong server!');
        }

        const emojiData = client.emojis_custom;
        const { emojis, updated } = await fetchAndSyncEmojis(guild, emojiData || {});

        // Cập nhật lại client nếu có thay đổi
        if (updated) {
            try {
                client.emojis_custom = JSON.parse(fs.readFileSync(EMOJI_JSON_PATH, 'utf-8'));
            } catch { /* bỏ qua lỗi đọc file */ }
        }

        if (emojis.length === 0) {
            return message.reply('❌ Không có emoji tùy chỉnh nào trên server!');
        }

        const itemsPerPage = 20;
        const totalPages = Math.ceil(emojis.length / itemsPerPage);
        let currentPage = 0;

        const generateEmbed = (page) => {
            const start = page * itemsPerPage;
            const end = start + itemsPerPage;
            const currentItems = emojis.slice(start, end);

            return new EmbedBuilder()
                .setColor(client.config.colors.info)
                .setTitle(`🎭 Danh sách Emoji – ${emojis.length} emoji${updated ? ' *(đã cập nhật ID)*' : ''}`)
                .setDescription(currentItems.join('\n'))
                .setFooter({ text: `Trang ${page + 1}/${totalPages} • ID được lấy trực tiếp từ server` })
                .setTimestamp();
        };

        const generateButtons = (page) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('first')
                    .setEmoji('⏪')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setEmoji('⬅️')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('delete')
                    .setEmoji('🗑️')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setEmoji('➡️')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(page === totalPages - 1),
                new ButtonBuilder()
                    .setCustomId('last')
                    .setEmoji('⏩')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === totalPages - 1)
            );
        };

        const sentMessage = await message.reply({
            embeds: [generateEmbed(currentPage)],
            components: [generateButtons(currentPage)]
        });

        const collector = sentMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000
        });

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: 'Bạn không thể sử dụng bảng điều khiển này!', ephemeral: true });
            }

            if (i.customId === 'first') currentPage = 0;
            else if (i.customId === 'prev') currentPage--;
            else if (i.customId === 'next') currentPage++;
            else if (i.customId === 'last') currentPage = totalPages - 1;
            else if (i.customId === 'delete') {
                return await sentMessage.delete();
            }

            await i.update({
                embeds: [generateEmbed(currentPage)],
                components: [generateButtons(currentPage)]
            });
        });

        collector.on('end', () => {
            sentMessage.edit({ components: [] }).catch(() => null);
        });
    }
};

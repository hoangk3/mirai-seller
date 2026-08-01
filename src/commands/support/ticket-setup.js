const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, AttachmentBuilder } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

/**
 * Helper to resolve local image files from config paths
 */
function resolveLocalFile(configPath, relativeToRootDepth = 3) {
    if (!configPath) return null;
    if (configPath.startsWith('http://') || configPath.startsWith('https://') || configPath.startsWith('attachment://')) {
        return null;
    }
    const rootPath = path.join(__dirname, '../'.repeat(relativeToRootDepth));
    const pathsToTry = [
        path.join(rootPath, configPath),
        path.join(rootPath, 'src/img', path.basename(configPath)),
        path.join(rootPath, 'img', path.basename(configPath))
    ];
    for (const p of pathsToTry) {
        if (fs.existsSync(p)) {
            return p;
        }
    }
    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-setup')
        .setDescription('Cài đặt hệ thống ticket với giao diện DOTTIE INC')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Kênh để gửi tin nhắn tạo ticket')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        const channel = interaction.options.getChannel('channel');
        await interaction.deferReply({ flags: [4096] });

        const files = [];
        const embed = new EmbedBuilder()
            .setColor(0xffb6c1)
            .setTitle('<:DR_Star:1519345815678881872> CHÀO MỪNG ĐẾN VỚI DOTTIE INC <:DR_Star:1519345815678881872>')
            .setDescription(`
# <a:DR_arrow2:1519352142669021224>**Nhấn Vào [ <:DR_shopping:1519345810544918709> ]**
• Để Được Tư Vấn , Mua Các Mặt Hàng Sẵn Có Của DOTTIE INC <a:Dorosex:1330160523039215719>

# <a:DR_arrow2:1519352142669021224>**Nhấn Vào [ <:DR_ticket:1519681170584109217>  ]**
• Để Được Hỗ Trợ Thắc Mắc , Trao Giải Giveaway , Bla bla Của DOTTIE INC <a:Dorosex:1330160523039215719>
# <a:DR_dongho:1519352199401050192> **Thời Gian Làm Việc**
• 7H Sáng -> 22H Tối. Thực ra là lúc nào cũng có thể hỗ trợ mà sẽ lâu lâu xíu,,,

# <a:DR_chuong:1519352185744261191> **Lưu Ý Quan Trọng** <a:DR_chuong:1519352185744261191>

• **Tạo Ticket Không Lý Do Sẽ Bị Xử Lý :**
• Lần Đầu : Cảnh Cáo
• Lần Hai : Sybau 1D
• Lần Ba : ||BayMau||
            `)
            .setFooter({ text: 'DOTTIE MANAGER | Phục vụ tận tâm', iconURL: interaction.guild.iconURL() })
            .setTimestamp();

        // Author icon
        const authorIcon = client.config?.ui?.authorIcon;
        if (authorIcon) {
            if (authorIcon.startsWith('http://') || authorIcon.startsWith('https://') || authorIcon.startsWith('attachment://')) {
                embed.setAuthor({ name: '👩🏻‍🎤 DOTTIE INC - Ticket Hỗ Trợ - Mua Hàng', iconURL: authorIcon });
            } else {
                const filePath = resolveLocalFile(authorIcon, 3);
                if (filePath) {
                    const fileName = path.basename(filePath);
                    files.push(new AttachmentBuilder(filePath, { name: fileName }));
                    embed.setAuthor({ name: '👩🏻‍🎤 DOTTIE INC - Ticket Hỗ Trợ - Mua Hàng', iconURL: `attachment://${fileName}` });
                } else {
                    embed.setAuthor({ name: '👩🏻‍🎤 DOTTIE INC - Ticket Hỗ Trợ - Mua Hàng' });
                }
            }
        } else {
            embed.setAuthor({ name: '👩🏻‍🎤 DOTTIE INC - Ticket Hỗ Trợ - Mua Hàng' });
        }

        // Thumbnail
        const thumbnail = client.config?.ui?.thumbnail;
        if (thumbnail) {
            if (thumbnail.startsWith('http://') || thumbnail.startsWith('https://') || thumbnail.startsWith('attachment://')) {
                embed.setThumbnail(thumbnail);
            } else {
                const filePath = resolveLocalFile(thumbnail, 3);
                if (filePath) {
                    const fileName = path.basename(filePath);
                    files.push(new AttachmentBuilder(filePath, { name: fileName }));
                    embed.setThumbnail(`attachment://${fileName}`);
                }
            }
        }

        // Banner
        const banner = client.config?.ui?.banner;
        if (banner) {
            if (banner.startsWith('http://') || banner.startsWith('https://') || banner.startsWith('attachment://')) {
                embed.setImage(banner);
            } else {
                const filePath = resolveLocalFile(banner, 3);
                if (filePath) {
                    const fileName = path.basename(filePath);
                    const alreadyAttached = files.find(f => f.file === filePath);
                    if (!alreadyAttached) {
                        files.push(new AttachmentBuilder(filePath, { name: fileName }));
                    }
                    embed.setImage(`attachment://${fileName}`);
                }
            }
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_open:support')
                .setLabel('Hỗ Trợ')
                .setEmoji('<:DR_ticket:1409894696326529066>')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('ticket_open:billing')
                .setLabel('Mua Hàng')
                .setEmoji('<a:DR_shopping:1410628577384202410>')
                .setStyle(ButtonStyle.Success)
        );

        await channel.send({ embeds: [embed], components: [row], files });
        const reply = await interaction.editReply({ content: `<:DR_Arrow:1409908984122703964> ✅ Đã cài đặt hệ thống ticket thành công tại ${channel}` });
        setTimeout(() => {
            reply.delete().catch(() => {});
        }, 5000);
    }
};

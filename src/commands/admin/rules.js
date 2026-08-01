const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    category: 'moderation',
    data: new SlashCommandBuilder()
        .setName('rules')
        .setDescription('Gửi bảng quy định của server vào kênh Rules')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        const rulesChannelId = '1361683788610011447';
        const channel = await client.channels.fetch(rulesChannelId).catch(() => null);

        if (!channel) {
            return interaction.reply({
                content: `Không tìm thấy kênh với ID: ${rulesChannelId}. Vui lòng kiểm tra lại.`,
                flags: [MessageFlags.Ephemeral]
            });
        }

        const embed = new EmbedBuilder()
            .setColor(client.config.colors.info || 0x3498db)
            .setTitle('📜 QUY ĐỊNH CỘNG ĐỒNG Dottie Community')
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .setDescription(`Chào mừng bạn đến với **Dottie Community**! Để xây dựng một môi trường văn minh, vui lòng tuân thủ các quy định sau:`)
            .addFields(
                {
                    name: '🛡️ Quy tắc chung',
                    value: `• Tôn trọng mọi người, không toxic, "không chửi bậy", không gây drama.\n• Không spam, flood chat, hoặc quảng cáo.\n• Không được share link độc hại, scam, hoặc nội dung 18+.\n• Ngôn ngữ chính: **Tiếng Việt** (tránh spam tiếng khác).\n• Hỏi đáp và nói chuyện XÀM (tại <#1361368932644290743>).`
                },
                {
                    name: '🤝 Mua bán',
                    value: `• Chỉ giao dịch tại các kênh được phân bổ (<#1361676227349577768>).\n• Khi đăng bán, phải có ảnh chụp bằng chứng (vd: proof Robux, thẻ, acc, hàng online).\n• Cấm bán hàng cấm (acc crack, hàng lậu, key bất hợp pháp).\n• Khi deal xong, nên chốt bằng tin nhắn rõ ràng trong server.`
                },
                {
                    name: '💳 Thanh toán & Trung gian',
                    value: `• Khuyến khích dùng **GDTG (Giao dịch trung gian)** để tránh scam.\n• Không ép buộc người khác phải đi trước (trừ khi có uy tín).\n• Mọi giao dịch đều chịu trách nhiệm cá nhân – server chỉ hỗ trợ trong phạm vi có thể.`
                },
                {
                    name: '⚠️ Scam & Xử lý',
                    value: `• Cấm tuyệt đối scam. Nếu bị phát hiện: **Ban vĩnh viễn + Blacklist public**.\n• Ai bị nghi ngờ scam, hãy report kèm bằng chứng cho staff.\n• Các cuộc giao dịch phải có screenshot/video nếu muốn được hỗ trợ khi có vấn đề.`
                },
                {
                    name: '👑 Lưu ý cuối cùng',
                    value: `**Ở ĐÂY TÔI LÀ LUẬT!** Chúc bạn có những phút giây vui vẻ tại server.`
                }
            )
            .setFooter({ text: 'Dottie Inc - Uy tín tạo nên thương hiệu', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        await channel.send({ embeds: [embed] });
        await interaction.reply({ content: `✅ Đã gửi bảng quy định vào kênh <#${rulesChannelId}>!`, flags: [MessageFlags.Ephemeral] });
    }
};

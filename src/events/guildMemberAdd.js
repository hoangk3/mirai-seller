// src/events/guildMemberAdd.js
const { Events, EmbedBuilder, AttachmentBuilder, PermissionsBitField } = require('discord.js');
const path = require('node:path');
const logger = require('../utils/logger');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        try {
            logger.info(`👋 Thành viên mới: ${member.user.tag}`);

            // ---- 1️⃣ Find a welcome channel -------------------------------------------------
            const welcomeChannelId = '1517814151106396160'; 
            let channel = member.guild.channels.cache.get(welcomeChannelId);

            if (!channel) {
                channel = member.guild.channels.cache.find(
                    ch => ch.isTextBased() &&
                          ch.permissionsFor(member.guild.members.me).has(PermissionsBitField.Flags.SendMessages)
                );
            }

            if (!channel) {
                logger.warn('⚠️ Không tìm thấy kênh chào mừng phù hợp.');
                return;
            }

            // ---- 2️⃣ Prepare local image attachments ---------------------------------------
            const iconPath = path.resolve(__dirname, '../img/icon.gif');
            const imagPath = path.resolve(__dirname, '../img/imag.gif');

            const iconAttachment = new AttachmentBuilder(iconPath, { name: 'icon.gif' });
            const imagAttachment = new AttachmentBuilder(imagPath, { name: 'imag.gif' });

            // ---- 3️⃣ Build the embed --------------------------------------------------------
            const embed = new EmbedBuilder()
                .setColor('#2F3136')
                .setTitle('Chúc bạn có trải nghiệm tốt về dịch vụ tại shop')
                .setAuthor({
                    name: `Dottie xin chào ${member.user.username}!!!`,
                    iconURL: 'attachment://icon.gif' // Icon nhỏ cạnh tên Author
                })
                .setDescription('### Các bạn ghé các kênh sau để hiểu hơn về chúng mình nha')
                .addFields([{
                    name: '・https://discord.com/channels/1250087774665838654/1517815511835086878',
                    value: [
                        '・https://discord.com/channels/1250087774665838654/1518212361801039943',
                        '・https://discord.com/channels/1250087774665838654/1439230303481757726',
                        '・https://discord.com/channels/1250087774665838654/1518968813473894531',
                        ' Mở ticket tại https://discord.com/channels/1250087774665838654/1517815948009279488 nếu bạn muốn mua hàng cũng như cần hỗ trợ !!!'
                    ].join('\n'),
                    inline: false
                }])
                // ĐÃ SỬA: Đưa Avatar của người mới vào lên góc trên cùng bên phải
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                // ĐÃ SỬA: Đưa file imag.gif xuống làm ảnh lớn ở dưới cùng của Embed
                .setImage('attachment://imag.gif');

            // ---- 4️⃣ Send the welcome message ---------------------------------------------
            await channel.send({
                content: `Chào mừng <@${member.id}>! 🎉`,
                embeds: [embed],
                files: [iconAttachment, imagAttachment]
            });

            logger.success(`✅ Đã gửi tin chào mừng cho ${member.user.tag}`);
        } catch (err) {
            logger.error('❌ Uncaught Exception in guildMemberAdd:', err);
        }
    }
};
const { AttachmentBuilder, SlashCommandBuilder } = require("discord.js");
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const path = require("path");
const fs = require("fs");

// Import model
const UserData = require("../../models/UserData");
const logger = require("../../utils/logger");
const config = require("../../config/discord-config");

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

// --- ĐĂNG KÝ FONT CHỮ ---
try {
    GlobalFonts.registerFromPath(path.join(__dirname, "../../fonts/static/Nunito-Bold.ttf"), "NunitoBold");
    GlobalFonts.registerFromPath(path.join(__dirname, "../../fonts/static/Nunito-Regular.ttf"), "Nunito");
} catch (e) {
    logger.warn("⚠️ Không tìm thấy file font tại src/fonts/, Bot sẽ dùng font mặc định.");
}

/**
 * Helper function - vẽ rounded rectangle
 */
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

/**
 * Generate user card attachment
 */
async function generateUserCard(targetUser, guild, client, page = 1) {
    try {
        const avatarUrl = targetUser.displayAvatarURL({ extension: "png", forceStatic: true, size: 128 });

        const [dataRaw, avatarImg] = await Promise.all([
            UserData.findOne({ userId: targetUser.id }).catch(e => {
                logger.error(`Lỗi DB cho ${targetUser.id}:`, e.message);
                return null;
            }),
            Promise.race([
                loadImage(avatarUrl),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
            ]).catch(() => null)
        ]);

        let data = dataRaw;
        if (!data) {
            data = { totalSpent: 0, history: [] };
        } else {
            // Tự động dọn dẹp lịch sử trùng lặp nếu có (Dựa trên phản hồi người dùng)
            const originalLength = data.history.length;
            const uniqueHistory = [];
            const seenOrderIds = new Set();
            
            for (const item of data.history) {
                if (!item.orderId || !seenOrderIds.has(item.orderId)) {
                    uniqueHistory.push(item);
                    if (item.orderId) seenOrderIds.add(item.orderId);
                }
            }
            
            if (uniqueHistory.length < originalLength) {
                // Tính toán lại tổng chi tiêu dựa trên lịch sử duy nhất
                const newTotalSpent = uniqueHistory.reduce((sum, item) => {
                    const priceNum = parseInt(item.price.replace(/\./g, '').replace(/,/g, '')) || 0;
                    return sum + priceNum;
                }, 0);

                data.history = uniqueHistory;
                data.totalSpent = newTotalSpent;

                // Cập nhật lại DB luôn để lần sau không bị nữa
                await UserData.updateOne(
                    { userId: targetUser.id }, 
                    { $set: { history: uniqueHistory, totalSpent: newTotalSpent } }
                );
                logger.info(`Đã dọn dẹp ${originalLength - uniqueHistory.length} đơn trùng lặp và cập nhật lại totalSpent cho ${targetUser.id}`);
            }
        }

        // Milestones logic
        const milestones = [
            { role: 'TÂN BINH', amount: 0 },
            { role: 'VIP 500K', amount: 500000 },
            { role: 'VIP 1M', amount: 1000000 },
            { role: 'VIP 2M', amount: 2000000 },
            { role: 'VIP 5M', amount: 5000000 }
        ];
        let currentMilestone = milestones[0];
        let nextMilestone = milestones[1];
        for (let i = 0; i < milestones.length; i++) {
            if (data.totalSpent >= milestones[i].amount) {
                currentMilestone = milestones[i];
                nextMilestone = milestones[i + 1] || milestones[i];
            }
        }
        const targetVIP = nextMilestone.amount > currentMilestone.amount ? nextMilestone.amount : Math.max(currentMilestone.amount, 500000);

        let topPosition = "?";
        let memType = "Thành viên";

        try {
            const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
            if (targetMember && targetMember.permissions.has("Administrator")) {
                memType = "Quản lý";
            }
        } catch (e) { }

        try {
            const allUsers = await UserData.find({ totalSpent: { $gt: 0 } })
                .sort({ totalSpent: -1 })
                .lean()
                .select("userId");

            const rankIndex = allUsers.findIndex(u => u.userId === targetUser.id);
            if (rankIndex !== -1) {
                topPosition = rankIndex + 1;
            } else if (data.totalSpent === 0 || !data.totalSpent) {
                topPosition = allUsers.length + 1;
            }
        } catch (e) {
            logger.warn("Lỗi tính Top Chi Tiêu: ", e.message);
        }

        // 3. THIẾT KẾ CANVAS
        const canvas = createCanvas(800, 500);
        const ctx = canvas.getContext("2d");

        // Nền thẻ
        const grad = ctx.createLinearGradient(0, 0, 800, 500);
        grad.addColorStop(0, "#1a1a2e");
        grad.addColorStop(1, "#000000");
        ctx.fillStyle = grad;
        roundRect(ctx, 0, 0, 800, 500, 40);
        ctx.fill();

        // Viền Neon hồng
        ctx.strokeStyle = "#fda2f6";
        ctx.lineWidth = 5;
        ctx.stroke();

        // 4. VẼ AVATAR
        if (avatarImg) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(130, 130, 85, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(avatarImg, 45, 45, 170, 170);
            ctx.restore();
        } else {
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(130, 130, 85, 0, Math.PI * 2);
            ctx.fill();
        }

        // 5. HIỆN TÊN
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 38px NunitoBold";
        const displayName = targetUser.globalName || targetUser.username;
        ctx.fillText(`${displayName.toUpperCase()} #${topPosition}`, 250, 95);

        // Chữ chi tiêu
        ctx.font = "bold 20px NunitoBold";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(`Đã chi: ${data.totalSpent.toLocaleString("vi-VN")} VND`, 250, 125);

        // --- THANH PROGRESS BAR ---
        const barWidth = 500;
        const barHeight = 30;
        const barX = 250;
        const barY = 145;
        const borderRadius = 15;

        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        roundRect(ctx, barX, barY, barWidth, barHeight, borderRadius);
        ctx.fill();

        const percent = targetVIP > 0 ? Math.min((data.totalSpent / targetVIP), 1) : 1;
        const progressWidth = barWidth * percent;
        const percentText = (percent * 100).toFixed(1) + "%";

        if (progressWidth > 0) {
            ctx.fillStyle = "#fda2f6";
            roundRect(ctx, barX, barY, progressWidth, barHeight, borderRadius);
            ctx.fill();
        }

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px NunitoBold";
        ctx.textAlign = "center";
        ctx.fillText(percentText, barX + barWidth / 2, barY + 20);
        ctx.textAlign = "left";

        // Left / Right text below bar
        ctx.font = "18px Nunito";
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillText(`${memType}`, 250, 205);

        const rightText = `${nextMilestone.role} - ${nextMilestone.amount.toLocaleString("vi-VN")} VND`;
        ctx.textAlign = "right";
        ctx.fillText(rightText, 250 + barWidth, 205);
        ctx.textAlign = "left";

        // --- KHUNG LỊCH SỬ ---
        ctx.fillStyle = "rgba(253, 162, 246, 0.05)";
        roundRect(ctx, 40, 260, 720, 210, 30);
        ctx.fill();

        const history = data.history || [];
        const pageCount = Math.ceil(history.length / 3) || 1;
        const currentPage = Math.max(1, Math.min(page, pageCount));
        const top3 = [...history].reverse().slice((currentPage - 1) * 3, currentPage * 3);

        // Hiển thị số trang trên canvas
        if (pageCount > 1) {
            ctx.font = "14px NunitoBold";
            ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
            ctx.textAlign = "right";
            ctx.fillText(`Trang ${currentPage}/${pageCount}`, 730, 290);
            ctx.textAlign = "left"; // Khôi phục mặc định
        }

        // Tiêu đề bảng
        ctx.font = "bold 18px NunitoBold";
        ctx.fillStyle = "#fda2f6";
        ctx.fillText("# MÃ ĐƠN", 60, 310);
        ctx.fillText("SẢN PHẨM", 200, 310);
        ctx.fillText("GIÁ", 480, 310);
        ctx.fillText("THỜI HẠN", 650, 310);

        // Nội dung bảng
        ctx.font = "18px NunitoBold";
        if (top3.length > 0) {
            top3.forEach((item, i) => {
                const y = 355 + (i * 45);

                // Cột 1: Mã đơn
                ctx.fillStyle = "#00ff00";
                ctx.fillText("| ", 60, y);
                const pipeWidth = ctx.measureText("| ").width;
                ctx.fillStyle = "#ffffff";
                ctx.fillText(`${item.orderId || "N/A"}`, 60 + pipeWidth, y);

                // Cột 2: Sản phẩm
                ctx.fillStyle = "#ffffff";
                ctx.fillText(`${item.name.substring(0, 20)}`, 200, y);

                // Cột 3: Giá
                ctx.fillStyle = "#00ff00";
                ctx.fillText(`${item.price}đ`, 480, y);

                // Cột 4: Thời hạn
                ctx.fillStyle = "#ffffff";
                let expireDateText = "Vĩnh viễn";

                if (item.timestamp && item.warrantyDays) {
                    const muaLuc = item.timestamp;
                    const soNgayBaoHanhMili = item.warrantyDays * 86400000;
                    const hanChot = muaLuc + soNgayBaoHanhMili;
                    const now = Date.now();

                    if (now > hanChot) {
                        expireDateText = "Hết BH";
                    } else {
                        const soNgayConLai = Math.ceil((hanChot - now) / 86400000);
                        expireDateText = `Còn ${soNgayConLai} ngày`;
                    }
                } else if (item.date) {
                    expireDateText = item.date;
                }

                ctx.fillText(expireDateText, 650, y);
            });
        } else {
            ctx.fillStyle = "rgba(255,255,255,0.4)";
            ctx.fillText("Chưa có lịch sử giao dịch.", 70, 355);
        }

        ctx.textAlign = "center";
        ctx.font = "bold 16px NunitoBold";
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.fillText("Dottie Inc", 400, 485);
        ctx.textAlign = "left";

        // Xuất ảnh
        const attachment = new AttachmentBuilder(await canvas.encode("png"), { name: `dottie_${targetUser.id}_${Date.now()}.png` });
        return { attachment, pageCount };

    } catch (error) {
        logger.error('Lỗi generateUserCard:', error.message);
        throw error;
    }
}

module.exports = {
    generateUserCard,

    // Slash Command
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Xem thông tin của người dùng')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Người dùng cần xem thông tin (mặc định: bạn)')
                .setRequired(false)
        ),

    // Prefix Command
    name: 'me',
    description: 'Xem thông tin của bạn hoặc người khác: !me [@user]',
    aliases: ['info', 'userinfo', 'profile', 'pro', 'serverinfo'],

    async execute(interactionOrMessage, args = null) {
        const isInteraction = interactionOrMessage.isChatInputCommand?.() || interactionOrMessage.isCommand?.();
        const client = interactionOrMessage.client;

        try {
            let targetUser;
            let guild;

            if (isInteraction) {
                targetUser = interactionOrMessage.options.getUser('user') || interactionOrMessage.user;
                guild = interactionOrMessage.guild;
            } else {
                const message = interactionOrMessage;
                targetUser = message.mentions.users.first() ||
                    (args?.[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null) ||
                    message.author;
                guild = message.guild;
            }

            if (!targetUser) {
                const errorMsg = `${config.EMOJIS.CROSS || '❌'} Không tìm được người dùng!`;
                if (isInteraction) {
                    await interactionOrMessage.reply({ content: errorMsg, flags: [64] });
                } else {
                    await interactionOrMessage.reply(errorMsg);
                }
                return;
            }

            // Fetch User Data from DB
            let data = await UserData.findOne({ userId: targetUser.id }).catch(() => null);
            if (!data) {
                data = { totalSpent: 0 };
            }

            // Get target member in guild
            const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
            if (!targetMember) {
                const errorMsg = `${config.EMOJIS.CROSS || '❌'} Thành viên không ở trong server!`;
                if (isInteraction) {
                    await interactionOrMessage.reply({ content: errorMsg, flags: [64] });
                } else {
                    await interactionOrMessage.reply(errorMsg);
                }
                return;
            }

            // Get Join Position (Member Number)
            let joinPosition = '?';
            try {
                const members = await guild.members.fetch();
                joinPosition = [...members.values()]
                    .sort((a, b) => (a.joinedTimestamp || 0) - (b.joinedTimestamp || 0))
                    .findIndex(m => m.id === targetUser.id) + 1;
            } catch (e) {
                logger.warn('Không thể đếm số thứ tự thành viên:', e.message);
            }

            // Get Roles List
            const rolesList = targetMember.roles.cache
                .filter(r => r.id !== guild.id) // Exclude @everyone
                .map(r => r.toString())
                .join(', ') || 'Không có';

            // Create Embed
            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder()
                .setColor(config.COLORS?.PRIMARY || '#8b5f8f')
                .setTitle(`Bạn là thành viên thứ ${joinPosition}`)
                .setDescription([
                    `### Role : ${rolesList}`,
                    `### Joined at : <t:${Math.floor(targetMember.joinedTimestamp / 1000)}:F> (<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>)`,
                    `### Created at : <t:${Math.floor(targetUser.createdTimestamp / 1000)}:F> (<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>)`,
                    `### Price : ${data.totalSpent.toLocaleString('vi-VN')} VND`,
                    `id : ${targetUser.id}`
                ].join('\n'))
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }));

            const embedFiles = [];
            const authorIcon = client.config?.ui?.authorIcon;
            if (authorIcon) {
                if (authorIcon.startsWith('http://') || authorIcon.startsWith('https://') || authorIcon.startsWith('attachment://')) {
                    embed.setAuthor({
                        name: `Tổng Quan Về ${targetUser.username}`,
                        iconURL: authorIcon
                    });
                } else {
                    const filePath = resolveLocalFile(authorIcon, 3);
                    if (filePath) {
                        const fileName = path.basename(filePath);
                        embedFiles.push(new AttachmentBuilder(filePath, { name: fileName }));
                        embed.setAuthor({
                            name: `Tổng Quan Về ${targetUser.username}`,
                            iconURL: `attachment://${fileName}`
                        });
                    } else {
                        embed.setAuthor({ name: `Tổng Quan Về ${targetUser.username}` });
                    }
                }
            } else {
                embed.setAuthor({ name: `Tổng Quan Về ${targetUser.username}` });
            }

            if (isInteraction) {
                await interactionOrMessage.reply({ embeds: [embed], files: embedFiles });
            } else {
                await interactionOrMessage.reply({ embeds: [embed], files: embedFiles });
            }

            logger.success(`Userinfo embed sent for ${targetUser.tag}`);
        } catch (error) {
            logger.error('Lỗi userinfo embed:', error.message);
            const errorMsg = `${config.EMOJIS.CROSS || '❌'} Lỗi: ${error.message}`;
            if (isInteraction) {
                if (interactionOrMessage.replied || interactionOrMessage.deferred) {
                    await interactionOrMessage.editReply({ content: errorMsg }).catch(() => {});
                } else {
                    await interactionOrMessage.reply({ content: errorMsg, flags: [64] }).catch(() => {});
                }
            } else {
                await interactionOrMessage.reply(errorMsg).catch(() => {});
            }
        }
    }
};

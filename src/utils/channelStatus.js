const logger = require('./logger');
const config = require('../config/discord-config');

// Quản lý thời gian chờ để tránh đổi tên kênh quá nhanh (Discord giới hạn 2 lần đổi tên kênh mỗi 10 phút)
const renameHistories = new Map(); // channelId -> danh sách mốc thời gian đổi tên (timestamps)
const pendingRenames = new Map(); // channelId -> setTimeout ID
const pendingNames = new Map(); // channelId -> tên kênh mới nhất cần đổi
const activeSyncs = new Set(); // lock key -> boolean

/**
 * An toàn cập nhật tên kênh Discord (tối đa 2 lần đổi tên / 10 phút)
 */
function safeSetChannelName(channel, newName) {
    if (!channel) return;
    const channelId = channel.id;

    if (channel.name === newName) {
        if (pendingRenames.has(channelId)) {
            clearTimeout(pendingRenames.get(channelId));
            pendingRenames.delete(channelId);
        }
        pendingNames.delete(channelId);
        return;
    }

    pendingNames.set(channelId, newName);

    // Nếu đã có lịch đổi tên kênh đang chờ cho kênh này, chỉ cần cập nhật tên mới nhất rồi kết thúc
    if (pendingRenames.has(channelId)) {
        return;
    }

    const now = Date.now();
    let history = renameHistories.get(channelId) || [];
    // Lọc bỏ các mốc thời gian đổi tên cũ hơn 10 phút
    history = history.filter(t => now - t < 10 * 60 * 1000);
    renameHistories.set(channelId, history);

    // Nếu đã đổi tên đủ 2 lần trong 10 phút qua, ta phải hoãn lại
    if (history.length >= 2) {
        const oldest = history[0];
        const delay = oldest + 10 * 60 * 1000 - now + 1000; // Cộng thêm 1 giây để đảm bảo hết hạn
        // Bị giới hạn bởi Discord (2 lần/10 phút), tự động xếp hàng đợi đổi tên

        const timeoutId = setTimeout(() => {
            pendingRenames.delete(channelId);
            const latestName = pendingNames.get(channelId);
            if (latestName) {
                safeSetChannelName(channel, latestName);
            }
        }, delay);

        pendingRenames.set(channelId, timeoutId);
        return;
    }

    // Thực hiện đổi tên ngay lập tức
    history.push(now);
    renameHistories.set(channelId, history);
    pendingNames.delete(channelId);

    channel.setName(newName)
        .then(() => {
            // Tự động cập nhật thành công, không cần log
        })
        .catch(error => {
            if (error.message && (error.message.includes('rate limit') || error.code === 50035)) {
                // Nếu bị rate limit thực tế từ Discord, coi như đã dùng hết lượt trong 10 phút qua
                const nowReal = Date.now();
                renameHistories.set(channelId, [nowReal - 5 * 60 * 1000, nowReal]); 
                
                const timeoutId = setTimeout(() => {
                    pendingRenames.delete(channelId);
                    const latestName = pendingNames.get(channelId);
                    if (latestName) {
                        safeSetChannelName(channel, latestName);
                    }
                }, 5 * 60 * 1000 + 1000);
                pendingRenames.set(channelId, timeoutId);
            } else {
                logger.error(`Lỗi khi đổi tên kênh ${channelId}:`, error);
            }
        });
}

/**
 * Đồng bộ số lượng đơn hàng pending và đổi tên kênh Processing
 */
async function syncProcessingChannelName(client) {
    const lockKey = 'syncProcessing';
    if (activeSyncs.has(lockKey)) return;
    activeSyncs.add(lockKey);

    try {
        const guildIdInput = process.env.GUILD_ID;
        if (!guildIdInput) return;
        const guildId = guildIdInput.split(/[,|\s]+/)[0].trim();

        const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) return;

        const channelId = config.CHANNELS.LOG; // '1361685222193762305'
        const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
        if (!channel) return;

        // Tải 100 tin nhắn mới nhất trong kênh log để tìm các đơn đang pending
        const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
        if (!messages) return;

        let pendingCount = 0;
        messages.forEach(msg => {
            if (msg.embeds && msg.embeds.length > 0) {
                const embed = msg.embeds[0];
                const desc = embed.description;
                if (desc && desc.includes('Tình Trạng Đơn Hàng') && (desc.includes('Đang xử lý...') || desc.includes(config.EMOJIS.LOADING))) {
                    pendingCount++;
                }
            }
        });

        const newName = `⚙️│ᴘʀᴏᴄᴇssɪɴɢ〈${pendingCount}〉`;
        safeSetChannelName(channel, newName);
    } catch (error) {
        logger.error('Lỗi trong syncProcessingChannelName:', error);
    } finally {
        activeSyncs.delete(lockKey);
    }
}

/**
 * Đồng bộ số lượng tin nhắn và đổi tên kênh Completed (Notify) từ ngày 10/03/2026
 */
async function syncCompletedChannelName(client, forceRecount = false) {
    const lockKey = 'syncCompleted';
    if (activeSyncs.has(lockKey)) return;
    activeSyncs.add(lockKey);

    try {
        const guildIdInput = process.env.GUILD_ID;
        if (!guildIdInput) return;
        const guildId = guildIdInput.split(/[,|\s]+/)[0].trim();

        const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) return;

        const channelId = config.CHANNELS.NOTIFY; // '1361685329718804612'
        const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
        if (!channel) return;

        let doneCount = client.completedOrdersCount;

        // Nếu chưa có cache hoặc được yêu cầu đếm lại từ đầu, thực hiện đếm thực tế từ API
        if (doneCount === undefined || forceRecount) {
            // Mốc thời gian ngày 10 tháng 3 năm 2026 (Múi giờ Đông Dương UTC+7)
            const targetDate = new Date('2026-03-10T00:00:00+07:00');
            // Đang đếm toàn bộ tin nhắn từ ngày 10/03/2026 trong kênh notify...
            
            doneCount = 0;
            let lastId = null;
            let fetchMore = true;
            let loopCount = 0;

            while (fetchMore && loopCount < 100) { // Giới hạn tối đa 100 lần fetch (10000 tin nhắn)
                loopCount++;
                const options = { limit: 100 };
                if (lastId) options.before = lastId;

                const messages = await channel.messages.fetch(options).catch(() => null);
                if (!messages || messages.size === 0) break;

                for (const [id, msg] of messages) {
                    lastId = id;

                    // Nếu tin nhắn được tạo trước ngày 10/03/2026 thì dừng quét
                    if (msg.createdAt < targetDate) {
                        fetchMore = false;
                        break;
                    }

                    doneCount++;
                }
            }

            // Lưu vào cache của client
            client.completedOrdersCount = doneCount;
            // Đã đếm xong: Tìm thấy ${doneCount} tin nhắn từ ngày 10/03/2026 trong kênh notify.
        }

        const newName = `✅│ᴄᴏᴍᴘʟᴇᴛᴇᴅ〈${doneCount}〉`;
        safeSetChannelName(channel, newName);
    } catch (error) {
        logger.error('Lỗi trong syncCompletedChannelName:', error);
    } finally {
        activeSyncs.delete(lockKey);
    }
}

/**
 * Đồng bộ số lượng tin nhắn (không tính BOT) và đổi tên kênh VOUCHER_TRUST (config.CHANNELS.STATUS)
 */
async function syncVouchChannelName(client, forceRecount = false) {
    const lockKey = 'syncVouch';
    if (activeSyncs.has(lockKey)) return;
    activeSyncs.add(lockKey);

    try {
        const guildIdInput = process.env.GUILD_ID;
        if (!guildIdInput) return;
        const guildId = guildIdInput.split(/[,|\s]+/)[0].trim();

        const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) return;

        const channelId = config.CHANNELS.STATUS; // '1361686324888993992'
        const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
        if (!channel) return;

        let vouchCount = client.vouchCount;

        // Nếu chưa có cache hoặc được yêu cầu đếm lại từ đầu, thực hiện đếm thực tế từ API
        if (vouchCount === undefined || forceRecount) {
            // Đang đếm toàn bộ tin nhắn của user (không tính bot) trong kênh VOUCHER_TRUST...
            
            vouchCount = 0;
            let lastId = null;
            let fetchMore = true;
            let loopCount = 0;

            while (fetchMore && loopCount < 200) { // Giới hạn tối đa 200 lần fetch (20000 tin nhắn)
                loopCount++;
                const options = { limit: 100 };
                if (lastId) options.before = lastId;

                const messages = await channel.messages.fetch(options).catch(() => null);
                if (!messages || messages.size === 0) break;

                for (const [id, msg] of messages) {
                    lastId = id;

                    // Không đếm tin của bot
                    if (!msg.author.bot) {
                        vouchCount++;
                    }
                }
            }

            // Lưu vào cache của client
            client.vouchCount = vouchCount;
            // Đã đếm xong: Tìm thấy tổng cộng ${vouchCount} tin nhắn vouch từ người dùng.
        }

        const newName = `🔰│ᴠᴏᴜᴄʜ－ᴛʀᴜsᴛ〈${vouchCount}〉`;
        safeSetChannelName(channel, newName);
    } catch (error) {
        logger.error('Lỗi trong syncVouchChannelName:', error);
    } finally {
        activeSyncs.delete(lockKey);
    }
}

module.exports = {
    syncProcessingChannelName,
    syncCompletedChannelName,
    syncVouchChannelName
};

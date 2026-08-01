const cooldowns = new Map();

function checkCooldown(type, userId, duration) {
    const key = `${type}:${userId}`;
    const now = Date.now();
    const expirationTime = (cooldowns.get(key) || 0) + duration;

    if (now < expirationTime) {
        return {
            onCooldown: true,
            remainingTime: Math.ceil((expirationTime - now) / 1000)
        };
    }

    cooldowns.set(key, now);
    return { onCooldown: false };
}

const COOLDOWNS = {
    TICKET_CREATE: 60000 // 1 minute
};

module.exports = { checkCooldown, COOLDOWNS };

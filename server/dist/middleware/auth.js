"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyTelegramAuth = verifyTelegramAuth;
const crypto_1 = __importDefault(require("crypto"));
const BOT_TOKEN = process.env.BOT_TOKEN || '';
/**
 * Verify Telegram Mini App initData using HMAC-SHA256.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function verifyTelegramAuth(req, res, next) {
    const initData = req.headers['x-telegram-init-data'];
    // In development, allow a mock user header
    if (!BOT_TOKEN && process.env.NODE_ENV !== 'production') {
        const mockUserId = req.headers['x-mock-user-id'];
        if (mockUserId) {
            req.telegramUser = {
                id: parseInt(mockUserId, 10),
                first_name: req.headers['x-mock-user-name'] || 'Dev User',
                username: req.headers['x-mock-username'] || undefined,
            };
            next();
            return;
        }
    }
    if (!initData) {
        res.status(401).json({ error: 'Missing Telegram initData' });
        return;
    }
    if (!BOT_TOKEN) {
        res.status(500).json({ error: 'Bot token not configured' });
        return;
    }
    try {
        const parsed = new URLSearchParams(initData);
        const hash = parsed.get('hash');
        if (!hash) {
            res.status(401).json({ error: 'Invalid initData: missing hash' });
            return;
        }
        // Build data-check-string
        parsed.delete('hash');
        const entries = Array.from(parsed.entries());
        entries.sort(([a], [b]) => a.localeCompare(b));
        const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');
        // Compute HMAC
        const secretKey = crypto_1.default
            .createHmac('sha256', 'WebAppData')
            .update(BOT_TOKEN)
            .digest();
        const computedHash = crypto_1.default
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');
        if (computedHash !== hash) {
            res.status(401).json({ error: 'Invalid initData signature' });
            return;
        }
        // Check auth_date is not too old (allow 24 hours)
        const authDate = parseInt(parsed.get('auth_date') || '0', 10);
        const now = Math.floor(Date.now() / 1000);
        if (now - authDate > 86400) {
            res.status(401).json({ error: 'initData expired' });
            return;
        }
        // Extract user
        const userStr = parsed.get('user');
        if (!userStr) {
            res.status(401).json({ error: 'Invalid initData: missing user' });
            return;
        }
        const user = JSON.parse(userStr);
        req.telegramUser = {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            photo_url: user.photo_url,
        };
        next();
    }
    catch {
        res.status(401).json({ error: 'Failed to verify initData' });
    }
}
//# sourceMappingURL=auth.js.map
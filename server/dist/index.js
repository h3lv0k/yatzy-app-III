"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = require("./middleware/auth");
const lobby_1 = __importDefault(require("./routes/lobby"));
const game_1 = __importDefault(require("./routes/game"));
const leaderboard_1 = __importDefault(require("./routes/leaderboard"));
const index_1 = require("./bot/index");
const turnTimer_1 = require("./services/turnTimer");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Health check
app.get('/health', (_req, res) => res.json({ ok: true, version: '4.0.0' }));
// Telegram Bot webhook (no auth needed — grammY handles verification)
const webhookHandler = (0, index_1.getWebhookCallback)();
if (webhookHandler) {
    app.post('/bot/webhook', webhookHandler);
    console.log('[bot] Webhook handler registered at POST /bot/webhook');
}
else {
    console.warn('[bot] BOT_TOKEN not set — bot webhook disabled');
}
// API routes (require Telegram auth)
app.use('/api/lobby', auth_1.verifyTelegramAuth, lobby_1.default);
app.use('/api/game', auth_1.verifyTelegramAuth, game_1.default);
app.use('/api/leaderboard', leaderboard_1.default); // public
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
    console.log(`Yatzy server v4 running on port ${PORT}`);
    // Recover turn timers for in-progress games
    await (0, turnTimer_1.recoverTimers)();
});
//# sourceMappingURL=index.js.map
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { verifyTelegramAuth } from './middleware/auth';
import lobbyRoutes from './routes/lobby';
import gameRoutes from './routes/game';
import leaderboardRoutes from './routes/leaderboard';
import { getWebhookCallback } from './bot/index';
import { recoverTimers } from './services/turnTimer';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ ok: true, version: '4.0.0' }));

// Telegram Bot webhook (no auth needed — grammY handles verification)
const webhookHandler = getWebhookCallback();
if (webhookHandler) {
  app.post('/bot/webhook', webhookHandler);
  console.log('[bot] Webhook handler registered at POST /bot/webhook');
} else {
  console.warn('[bot] BOT_TOKEN not set — bot webhook disabled');
}

// API routes (require Telegram auth)
app.use('/api/lobby', verifyTelegramAuth, lobbyRoutes);
app.use('/api/game', verifyTelegramAuth, gameRoutes);
app.use('/api/leaderboard', leaderboardRoutes); // public

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`Yatzy server v4 running on port ${PORT}`);

  // Recover turn timers for in-progress games
  await recoverTimers();
});

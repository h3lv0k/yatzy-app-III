"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bot = void 0;
exports.getWebhookCallback = getWebhookCallback;
const grammy_1 = require("grammy");
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://yatzy.vercel.app';
exports.bot = BOT_TOKEN ? new grammy_1.Bot(BOT_TOKEN) : null;
if (exports.bot) {
    // /start command — with optional deep link
    exports.bot.command('start', async (ctx) => {
        const payload = ctx.match; // deep link param after /start
        if (payload && payload.startsWith('lobby_')) {
            const code = payload.replace('lobby_', '');
            const keyboard = new grammy_1.InlineKeyboard()
                .webApp('Присоединиться к игре', `${WEBAPP_URL}?lobby=${code}`);
            await ctx.reply(`Вас пригласили в игру Yatzy!\nКод лобби: *${code}*`, { parse_mode: 'Markdown', reply_markup: keyboard });
            return;
        }
        const keyboard = new grammy_1.InlineKeyboard()
            .webApp('Играть в Yatzy', WEBAPP_URL);
        await ctx.reply(`Добро пожаловать в *Yatzy*! 🎲\n\n` +
            `Классическая игра в кости для 2 игроков.\n` +
            `Бросайте кубики, набирайте очки и побеждайте!\n\n` +
            `Нажмите кнопку ниже, чтобы начать играть.`, { parse_mode: 'Markdown', reply_markup: keyboard });
    });
    // /rules command
    exports.bot.command('rules', async (ctx) => {
        await ctx.reply(`📖 *Правила Yatzy*\n\n` +
            `Yatzy — игра в кости для 2 игроков.\n\n` +
            `*Ход:*\n` +
            `• У вас 5 кубиков и 3 броска за ход\n` +
            `• После каждого броска можно заморозить любые кубики\n` +
            `• После бросков выберите категорию для записи очков\n\n` +
            `*Категории:*\n` +
            `*Верхняя секция:* Единицы — Шестёрки (сумма подходящих)\n` +
            `  Бонус +35 если верхняя секция ≥ 63\n\n` +
            `*Нижняя секция:*\n` +
            `• Тройка (3 одинаковых) — сумма всех\n` +
            `• Каре (4 одинаковых) — сумма всех\n` +
            `• Фулл хаус (3+2) — 25 очков\n` +
            `• Малый стрит (4 подряд) — 30 очков\n` +
            `• Большой стрит (5 подряд) — 40 очков\n` +
            `• Yatzy (5 одинаковых) — 50 очков\n` +
            `• Шанс — сумма всех кубиков\n\n` +
            `*Игра:* 13 раундов, побеждает игрок с наибольшим счётом.\n` +
            `⏱️ Таймер хода: 60 секунд.`, { parse_mode: 'Markdown' });
    });
    // /help command
    exports.bot.command('help', async (ctx) => {
        const keyboard = new grammy_1.InlineKeyboard()
            .webApp('Открыть игру', WEBAPP_URL);
        await ctx.reply(`*Yatzy — Помощь*\n\n` +
            `Команды:\n` +
            `/start — Начать игру\n` +
            `/rules — Правила игры\n` +
            `/help — Эта справка\n\n` +
            `Чтобы пригласить друга, создайте лобби в игре и отправьте ему код или ссылку.`, { parse_mode: 'Markdown', reply_markup: keyboard });
    });
}
function getWebhookCallback() {
    if (!exports.bot)
        return null;
    return (0, grammy_1.webhookCallback)(exports.bot, 'express');
}
//# sourceMappingURL=index.js.map
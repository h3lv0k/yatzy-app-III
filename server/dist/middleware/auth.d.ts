import { Request, Response, NextFunction } from 'express';
import { TelegramUser } from '../types';
export interface AuthenticatedRequest extends Request {
    telegramUser?: TelegramUser;
}
/**
 * Verify Telegram Mini App initData using HMAC-SHA256.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export declare function verifyTelegramAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map
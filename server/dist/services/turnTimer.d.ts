/**
 * Start a 60-second timer for the current turn.
 * When it expires, auto-select the least valuable category.
 */
export declare function startTimer(gameId: string): void;
/**
 * Clear the timer for a game.
 */
export declare function clearTimer(gameId: string): void;
/**
 * Recover timers for in-progress games after server restart.
 */
export declare function recoverTimers(): Promise<void>;
//# sourceMappingURL=turnTimer.d.ts.map
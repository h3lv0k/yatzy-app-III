import { ScoreCategory } from '../types';
export declare function rollDie(): number;
export declare function rollDice(dice: number[], held: boolean[]): number[];
export declare function calculateScore(category: ScoreCategory, dice: number[]): number;
export declare function computeUpperTotal(scores: Record<string, number>): number;
export declare function computeTotalScore(scores: Record<string, number>): number;
/**
 * Find the least valuable available category for auto-select on timeout.
 * Priority: sacrifice upper categories first (ones, twos...), then lower.
 */
export declare function autoSelectCategory(dice: number[], usedCategories: ScoreCategory[]): ScoreCategory | null;
//# sourceMappingURL=yatzyLogic.d.ts.map
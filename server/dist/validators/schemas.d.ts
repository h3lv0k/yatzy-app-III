import { z } from 'zod';
import { ScoreCategory } from '../types';
export declare const joinLobbySchema: z.ZodObject<{
    code: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    code: string;
}, {
    code: string;
}>;
export declare const readySchema: z.ZodObject<{
    is_ready: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    is_ready: boolean;
}, {
    is_ready?: boolean | undefined;
}>;
export declare const holdDiceSchema: z.ZodObject<{
    index: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    index: number;
}, {
    index: number;
}>;
export declare const scoreCategorySchema: z.ZodObject<{
    category: z.ZodEnum<[ScoreCategory, ...ScoreCategory[]]>;
}, "strip", z.ZodTypeAny, {
    category: ScoreCategory;
}, {
    category: ScoreCategory;
}>;
//# sourceMappingURL=schemas.d.ts.map
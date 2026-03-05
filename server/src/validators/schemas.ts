import { z } from 'zod';
import { SCORE_CATEGORIES, ScoreCategory } from '../types';

export const joinLobbySchema = z.object({
  code: z.string().min(4).max(8).transform((v) => v.toUpperCase().trim()),
});

export const readySchema = z.object({
  is_ready: z.boolean().default(true),
});

export const holdDiceSchema = z.object({
  index: z.number().int().min(0).max(4),
});

export const scoreCategorySchema = z.object({
  category: z.enum(SCORE_CATEGORIES as [ScoreCategory, ...ScoreCategory[]]),
});

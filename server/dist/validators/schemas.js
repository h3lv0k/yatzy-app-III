"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreCategorySchema = exports.holdDiceSchema = exports.readySchema = exports.joinLobbySchema = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
exports.joinLobbySchema = zod_1.z.object({
    code: zod_1.z.string().min(4).max(8).transform((v) => v.toUpperCase().trim()),
});
exports.readySchema = zod_1.z.object({
    is_ready: zod_1.z.boolean().default(true),
});
exports.holdDiceSchema = zod_1.z.object({
    index: zod_1.z.number().int().min(0).max(4),
});
exports.scoreCategorySchema = zod_1.z.object({
    category: zod_1.z.enum(types_1.SCORE_CATEGORIES),
});
//# sourceMappingURL=schemas.js.map
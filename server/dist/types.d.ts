export type ScoreCategory = 'ones' | 'twos' | 'threes' | 'fours' | 'fives' | 'sixes' | 'three_of_a_kind' | 'four_of_a_kind' | 'full_house' | 'small_straight' | 'large_straight' | 'yatzy' | 'chance';
export declare const SCORE_CATEGORIES: ScoreCategory[];
export declare const UPPER_CATEGORIES: ScoreCategory[];
export interface DbPlayer {
    id: number;
    username: string | null;
    first_name: string;
    last_name: string | null;
    photo_url: string | null;
    total_games: number;
    wins: number;
    best_score: number;
    total_yatzy_count: number;
    created_at: string;
    updated_at: string;
}
export interface DbLobby {
    id: string;
    code: string;
    host_id: number;
    status: 'waiting' | 'playing' | 'finished' | 'expired';
    max_players: number;
    created_at: string;
    started_at: string | null;
    expires_at: string;
}
export interface DbLobbyPlayer {
    id: string;
    lobby_id: string;
    player_id: number;
    turn_order: number;
    is_ready: boolean;
    joined_at: string;
}
export interface DbGame {
    id: string;
    lobby_id: string;
    status: 'in_progress' | 'completed';
    current_round: number;
    current_player_id: number;
    current_roll: number;
    dice_values: number[];
    held_dice: boolean[];
    turn_started_at: string;
    turn_time_limit: number;
    winner_id: number | null;
    created_at: string;
    completed_at: string | null;
}
export interface DbGameScore {
    id: string;
    game_id: string;
    player_id: number;
    category: ScoreCategory;
    value: number;
    created_at: string;
}
export interface DbGameResult {
    id: string;
    game_id: string;
    player_id: number;
    total_score: number;
    upper_section_score: number;
    upper_bonus: boolean;
    placement: number;
}
export interface LeaderboardEntry {
    id: number;
    username: string | null;
    first_name: string;
    photo_url: string | null;
    best_score: number;
    wins: number;
    total_games: number;
    total_yatzy_count: number;
    win_rate: number;
    rank: number;
}
export interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
}
//# sourceMappingURL=types.d.ts.map
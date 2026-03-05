// ==========================================
// Client-side types for Yatzy V4
// ==========================================

export type ScoreCategory =
  | 'ones' | 'twos' | 'threes' | 'fours' | 'fives' | 'sixes'
  | 'three_of_a_kind' | 'four_of_a_kind' | 'full_house'
  | 'small_straight' | 'large_straight' | 'yatzy' | 'chance';

export const SCORE_CATEGORIES: ScoreCategory[] = [
  'ones', 'twos', 'threes', 'fours', 'fives', 'sixes',
  'three_of_a_kind', 'four_of_a_kind', 'full_house',
  'small_straight', 'large_straight', 'yatzy', 'chance',
];

export const UPPER_CATEGORIES: ScoreCategory[] = [
  'ones', 'twos', 'threes', 'fours', 'fives', 'sixes',
];

export const LOWER_CATEGORIES: ScoreCategory[] = [
  'three_of_a_kind', 'four_of_a_kind', 'full_house',
  'small_straight', 'large_straight', 'yatzy', 'chance',
];

export const CATEGORY_NAMES: Record<ScoreCategory, string> = {
  ones: 'Единицы',
  twos: 'Двойки',
  threes: 'Тройки',
  fours: 'Четвёрки',
  fives: 'Пятёрки',
  sixes: 'Шестёрки',
  three_of_a_kind: 'Тройка',
  four_of_a_kind: 'Каре',
  full_house: 'Фулл хаус',
  small_straight: 'Малый стрит',
  large_straight: 'Большой стрит',
  yatzy: 'Yatzy',
  chance: 'Шанс',
};

export const CATEGORY_ICONS: Record<ScoreCategory, string> = {
  ones: '⚀',
  twos: '⚁',
  threes: '⚂',
  fours: '⚃',
  fives: '⚄',
  sixes: '⚅',
  three_of_a_kind: '🎯',
  four_of_a_kind: '🎯',
  full_house: '🏠',
  small_straight: '📈',
  large_straight: '📈',
  yatzy: '🎲',
  chance: '🍀',
};

export interface PlayerInfo {
  id: number;
  username: string | null;
  first_name: string;
  last_name: string | null;
  photo_url: string | null;
  display_name: string | null;
  avatar_emoji: string;
  total_games: number;
  wins: number;
  best_score: number;
  total_yatzy_count: number;
  total_upper_bonus_count: number;
}

export interface LobbyPlayer {
  id: string;
  lobby_id: string;
  player_id: number;
  turn_order: number;
  is_ready: boolean;
  joined_at: string;
  players: PlayerInfo;
}

export interface LobbyState {
  id: string;
  code: string;
  host_id: number;
  status: 'waiting' | 'playing' | 'finished' | 'expired';
  max_players: number;
  created_at: string;
  started_at: string | null;
  expires_at: string;
  players: LobbyPlayer[];
  game_id: string | null;
}

export interface GameScore {
  id: string;
  game_id: string;
  player_id: number;
  category: ScoreCategory;
  value: number;
}

export interface GameState {
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
  scores: GameScore[];
  players: LobbyPlayer[];
}

export interface LeaderboardEntry {
  id: number;
  username: string | null;
  first_name: string;
  photo_url: string | null;
  display_name: string | null;
  avatar_emoji: string;
  best_score: number;
  wins: number;
  total_games: number;
  total_yatzy_count: number;
  win_rate: number;
  rank: number;
}

export type AppScreen = 'lobby' | 'waiting' | 'game' | 'gameover' | 'leaderboard' | 'profile';

export interface RecentGameResult {
  game_id: string;
  total_score: number;
  upper_section_score: number;
  upper_bonus: boolean;
  bonus_score: number;
  placement: number;
}

export interface ProfileData {
  id: number;
  username: string | null;
  first_name: string;
  last_name: string | null;
  photo_url: string | null;
  display_name: string | null;
  avatar_emoji: string;
  total_games: number;
  wins: number;
  best_score: number;
  total_yatzy_count: number;
  total_upper_bonus_count: number;
  avg_score: number;
  win_rate: number;
  rank: number | null;
  recent_games: RecentGameResult[];
  created_at: string;
}

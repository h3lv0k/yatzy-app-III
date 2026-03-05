import { ScoreCategory } from '../types';

export function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function rollDice(dice: number[], held: boolean[]): number[] {
  return dice.map((d, i) => (held[i] ? d : rollDie()));
}

function countFaces(dice: number[]): Record<number, number> {
  const counts: Record<number, number> = {};
  dice.forEach((d) => { counts[d] = (counts[d] || 0) + 1; });
  return counts;
}

function sumDice(dice: number[]): number {
  return dice.reduce((a, b) => a + b, 0);
}

export function calculateScore(category: ScoreCategory, dice: number[]): number {
  const counts = countFaces(dice);
  const vals = Object.values(counts);
  const total = sumDice(dice);

  switch (category) {
    case 'ones':    return (counts[1] || 0) * 1;
    case 'twos':    return (counts[2] || 0) * 2;
    case 'threes':  return (counts[3] || 0) * 3;
    case 'fours':   return (counts[4] || 0) * 4;
    case 'fives':   return (counts[5] || 0) * 5;
    case 'sixes':   return (counts[6] || 0) * 6;

    case 'three_of_a_kind':
      return vals.some((v) => v >= 3) ? total : 0;

    case 'four_of_a_kind':
      return vals.some((v) => v >= 4) ? total : 0;

    case 'full_house': {
      const hasThree = vals.some((v) => v === 3);
      const hasTwo   = vals.some((v) => v === 2);
      return hasThree && hasTwo ? 25 : 0;
    }

    case 'small_straight': {
      const unique = [...new Set(dice)].sort((a, b) => a - b);
      const straights = [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]];
      return straights.some((s) => s.every((v) => unique.includes(v))) ? 30 : 0;
    }

    case 'large_straight': {
      const sorted = [...new Set(dice)].sort((a, b) => a - b);
      return (
        JSON.stringify(sorted) === JSON.stringify([1, 2, 3, 4, 5]) ||
        JSON.stringify(sorted) === JSON.stringify([2, 3, 4, 5, 6])
      ) ? 40 : 0;
    }

    case 'yatzy':
      return vals.length === 1 ? 50 : 0;

    case 'chance':
      return total;

    default:
      return 0;
  }
}

export function computeUpperTotal(scores: Record<string, number>): number {
  return (scores['ones'] ?? 0) + (scores['twos'] ?? 0) + (scores['threes'] ?? 0) +
         (scores['fours'] ?? 0) + (scores['fives'] ?? 0) + (scores['sixes'] ?? 0);
}

export function computeTotalScore(scores: Record<string, number>): number {
  const upperTotal = computeUpperTotal(scores);
  const bonus = upperTotal >= 63 ? 35 : 0;
  const lower =
    (scores['three_of_a_kind'] ?? 0) + (scores['four_of_a_kind'] ?? 0) +
    (scores['full_house'] ?? 0) + (scores['small_straight'] ?? 0) +
    (scores['large_straight'] ?? 0) + (scores['yatzy'] ?? 0) + (scores['chance'] ?? 0);
  return upperTotal + bonus + lower;
}

/**
 * Find the least valuable available category for auto-select on timeout.
 * Priority: sacrifice upper categories first (ones, twos...), then lower.
 */
export function autoSelectCategory(
  dice: number[],
  usedCategories: ScoreCategory[]
): ScoreCategory | null {
  const available = ([
    'ones', 'twos', 'threes', 'fours', 'fives', 'sixes',
    'three_of_a_kind', 'four_of_a_kind', 'full_house',
    'small_straight', 'large_straight', 'yatzy', 'chance',
  ] as ScoreCategory[]).filter((c) => !usedCategories.includes(c));

  if (available.length === 0) return null;

  // Pick category with lowest score value (sacrifice least loss)
  let bestCat = available[0];
  let bestScore = calculateScore(available[0], dice);

  for (let i = 1; i < available.length; i++) {
    const score = calculateScore(available[i], dice);
    if (score < bestScore) {
      bestScore = score;
      bestCat = available[i];
    }
  }

  return bestCat;
}

export const letterGrades = ['AB', 'BB', 'CB'] as const;
export const modifiers = ['--', '-', '+', '++'] as const;

export type LetterGrade = typeof letterGrades[number];
export type Modifier = typeof modifiers[number];

export interface CustomRating {
  grade: LetterGrade;
  modifier: Modifier;
}

// This map converts a user's selection into a numerical score for storage and calculation.
// It's based on your examples (BB-- = 3, CB+ = 10) and a logical progression.
const RATING_MAP: Record<LetterGrade, Record<Modifier, number>> = {
  AB: { '--': 1, '-': 2, '+': 4, '++': 5 },
  BB: { '--': 3, '-': 5, '+': 7, '++': 8 },
  CB: { '--': 6, '-': 8, '+': 10, '++': 10 },
};

export function getScore(grade: LetterGrade, modifier: Modifier): number {
  return RATING_MAP[grade]?.[modifier] ?? 0;
}

// This list converts a calculated numerical score back into a displayable grade.
const SCORE_MAP: { score: number; display: string }[] = [
  { score: 10, display: 'CB++' },
  { score: 9.5, display: 'CB+' },
  { score: 8.5, display: 'CB' },
  { score: 8, display: 'CB-' },
  { score: 7, display: 'BB++' },
  { score: 6, display: 'BB+' },
  { score: 5, display: 'BB' },
  { score: 4, display: 'BB-' },
  { score: 3, display: 'AB++' },
  { score: 2, display: 'AB+' },
  { score: 1, display: 'AB' },
  { score: 0, display: 'AB-' },
];

export function getRatingDisplay(score: number | null): string {
  if (score === null) return 'N/A';
  
  for (const mapping of SCORE_MAP) {
    if (score >= mapping.score) {
      return mapping.display;
    }
  }
  return 'AB--';
} 
export const letterGrades = ['AB', 'BB', 'CB'] as const;
export const modifiers = ['--', '-', '+', '++'] as const;

export type LetterGrade = typeof letterGrades[number];
export type Modifier = typeof modifiers[number];

export interface CustomRating {
  grade: LetterGrade;
  modifier: Modifier;
}

// This map is now unambiguous. It keeps your key examples (BB-- = 3, CB+ = 10)
// while ensuring every rating combination has a unique score.
const RATING_MAP: Record<LetterGrade, Record<Modifier, number>> = {
  AB: { '--': 1.0, '-': 2.0, '+': 3.5, '++': 4.5 },
  BB: { '--': 3.0, '-': 5.0, '+': 7.0, '++': 8.0 },
  CB: { '--': 6.0, '-': 8.5, '+': 10.0, '++': 10.1 },
};

// This is the reverse map to find the grade/modifier from a score
const SCORE_TO_GRADE_MAP: { score: number; grade: LetterGrade; modifier: Modifier }[] = [
    { score: 1.0, grade: 'AB', modifier: '--' },
    { score: 2.0, grade: 'AB', modifier: '-' },
    { score: 3.5, grade: 'AB', modifier: '+' },
    { score: 4.5, grade: 'AB', modifier: '++' },
    { score: 3.0, grade: 'BB', modifier: '--' },
    { score: 5.0, grade: 'BB', modifier: '-' },
    { score: 7.0, grade: 'BB', modifier: '+' },
    { score: 8.0, grade: 'BB', modifier: '++' },
    { score: 6.0, grade: 'CB', modifier: '--' },
    { score: 8.5, grade: 'CB', modifier: '-' },
    { score: 10.0, grade: 'CB', modifier: '+' },
    { score: 10.1, grade: 'CB', modifier: '++' },
];

export function getGradeFromScore(score: number): { grade: LetterGrade | null; modifier: Modifier | null } {
    if (score === 0) return { grade: null, modifier: null };
    const match = SCORE_TO_GRADE_MAP.find(item => item.score === score);
    if (match) {
        return { grade: match.grade, modifier: match.modifier };
    }
    // Handle cases where only a grade was selected (defaults to '+')
    if (score === 7.0) return { grade: 'BB', modifier: null };
    if (score === 3.5) return { grade: 'AB', modifier: null };
    if (score === 10.0) return { grade: 'CB', modifier: null };
    
    return { grade: null, modifier: null };
}

export function getScore(grade: LetterGrade, modifier: Modifier): number {
  return RATING_MAP[grade]?.[modifier] ?? 0;
}

// This list converts a calculated numerical score back into a displayable grade.
const SCORE_MAP: { score: number; display: string }[] = [
  { score: 10.1, display: 'CB++' },
  { score: 10, display: 'CB+' },
  { score: 8.5, display: 'CB-' },
  { score: 8, display: 'BB++' },
  { score: 7, display: 'BB+' },
  { score: 6, display: 'CB--' },
  { score: 5, display: 'BB-' },
  { score: 4.5, display: 'AB++' },
  { score: 3.5, display: 'AB+' },
  { score: 3, display: 'BB--' },
  { score: 2, display: 'AB-' },
  { score: 1, display: 'AB--' },
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
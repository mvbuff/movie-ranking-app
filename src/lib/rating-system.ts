export const letterGrades = ['AB', 'BB', 'CB'] as const;
export const modifiers = ['--', '-', '+', '++'] as const;

export type LetterGrade = typeof letterGrades[number];
export type Modifier = typeof modifiers[number];

// This map is now unambiguous. Each grade/modifier combo has a unique score.
// A 'null' modifier represents selecting only the letter grade.
const RATING_MAP: Record<LetterGrade, Record<Modifier | 'NEUTRAL', number>> = {
  AB: { '--': 1, '-': 2, 'NEUTRAL': 3, '+': 4, '++': 5 },
  BB: { '--': 3, '-': 5, 'NEUTRAL': 6, '+': 7, '++': 8 }, // Kept BB-- at 3
  CB: { '--': 7, '-': 8.5, 'NEUTRAL': 9, '+': 10, '++': 10.1 }, // Kept CB+ at 10
};

// This is the reverse map to find the grade/modifier from a score.
const SCORE_TO_GRADE_MAP: { score: number; grade: LetterGrade; modifier: Modifier | null }[] = [
  { score: 1, grade: 'AB', modifier: '--' },
  { score: 2, grade: 'AB', modifier: '-' },
  { score: 3, grade: 'AB', modifier: null },
  { score: 4, grade: 'AB', modifier: '+' },
  { score: 5, grade: 'AB', modifier: '++' },
  { score: 3, grade: 'BB', modifier: '--' },
  { score: 5, grade: 'BB', modifier: '-' },
  { score: 6, grade: 'BB', modifier: null },
  { score: 7, grade: 'BB', modifier: '+' },
  { score: 8, grade: 'BB', modifier: '++' },
  { score: 7, grade: 'CB', modifier: '--' },
  { score: 8.5, grade: 'CB', modifier: '-' },
  { score: 9, grade: 'CB', modifier: null },
  { score: 10, grade: 'CB', modifier: '+' },
  { score: 10.1, grade: 'CB', modifier: '++' },
];

export function getGradeFromScore(score: number): { grade: LetterGrade | null; modifier: Modifier | null } {
    if (score === 0) return { grade: null, modifier: null };
    const match = SCORE_TO_GRADE_MAP.find(item => item.score === score);
    return match ? { grade: match.grade, modifier: match.modifier } : { grade: null, modifier: null };
}

export function getScore(grade: LetterGrade, modifier: Modifier | null): number {
  const effectiveModifier = modifier ?? 'NEUTRAL';
  return RATING_MAP[grade]?.[effectiveModifier] ?? 0;
}

// This list converts a calculated aggregate score back into a displayable grade.
const AGGREGATE_SCORE_MAP: { score: number; display: string }[] = [
  { score: 10.1, display: 'CB++' },
  { score: 10.0, display: 'CB+' },
  { score: 9.0, display: 'CB' },
  { score: 8.5, display: 'CB-' },
  { score: 8.0, display: 'BB++' },
  { score: 7.0, display: 'BB+' },
  { score: 6.0, display: 'BB' },
  { score: 5.0, display: 'BB-' },
  { score: 3.0, display: 'BB--' },
  { score: 4.0, display: 'AB+' },
  { score: 5.0, display: 'AB++' },
  { score: 3.0, display: 'AB' },
  { score: 2.0, display: 'AB-' },
  { score: 1.0, display: 'AB--' },
].sort((a,b) => b.score - a.score); // Sort descending to ensure correct lookup

export function getRatingDisplay(score: number | null): string {
  if (score === null || score === 0) return 'N/A';
  
  for (const mapping of AGGREGATE_SCORE_MAP) {
    if (score >= mapping.score) {
      return mapping.display;
    }
  }
  return 'AB--';
} 
export const letterGrades = ['AB', 'BB', 'CB'] as const;
export const modifiers = ['--', '-', '+', '++'] as const;

export type LetterGrade = typeof letterGrades[number];
export type Modifier = typeof modifiers[number];

// New, definitive mapping based on your final request.
const RATING_MAP: { [key: string]: number } = {
  'AB': 3,
  'BB--': 4, 'BB-': 4,
  'BB': 5,
  'BB+': 6,
  'BB++': 7,
  'CB-': 8,
  'CB': 9,
  'CB+': 9.5, 'CB++': 10,
};

// Create a reverse map for easy lookup from score to display.
// Prioritizes the user's preferred display for duplicate scores.
const SCORE_TO_GRADE_MAP: { [key: number]: string } = {
    3: 'AB',
    4: 'BB-', // Prioritize this display for score 4
    5: 'BB',
    6: 'BB+',
    7: 'BB++',
    8: 'CB-',
    9: 'CB',
    9.5: 'CB+',
    10: 'CB++',
};


export function getScore(grade: LetterGrade, modifier: Modifier | null): number {
  // AB is a fixed score with no modifiers
  if (grade === 'AB') return RATING_MAP['AB'];

  // If only a grade is selected (for BB or CB), use its neutral value.
  const key = modifier ? `${grade}${modifier}` : grade;
  return RATING_MAP[key] ?? 0;
}

export function getGradeFromScore(score: number): { grade: LetterGrade | null; modifier: Modifier | null } {
  const key = SCORE_TO_GRADE_MAP[score];
  if (!key) return { grade: null, modifier: null };

  if (key.length === 2) return { grade: key as LetterGrade, modifier: null };

  const grade = key.slice(0, 2) as LetterGrade;
  const modifier = key.slice(2) as Modifier;
  return { grade, modifier };
}


// This list converts a calculated aggregate score back into a displayable grade.
const AGGREGATE_SCORE_MAP: { score: number; display: string }[] = [
    { score: 10, display: 'CB++' },
    { score: 9.5, display: 'CB+' },
    { score: 9, display: 'CB' },
    { score: 8, display: 'CB-' },
    { score: 7, display: 'BB++' },
    { score: 6, display: 'BB+' },
    { score: 5, display: 'BB' },
    { score: 4, display: 'BB-' },
    { score: 3, display: 'AB' },
].sort((a,b) => b.score - a.score);

export function getRatingDisplay(score: number | null): string {
  if (score === null || score < 3) return 'N/A';
  
  for (const mapping of AGGREGATE_SCORE_MAP) {
    if (score >= mapping.score) {
      return mapping.display;
    }
  }
  return 'AB';
} 
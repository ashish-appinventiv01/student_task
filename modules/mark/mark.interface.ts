export type Exam = 'unit-1' | 'midterm' | 'unit-2' | 'final';

export interface Mark {
  id: number;
  studentId: number;
  exam: Exam;
  subject: string;
  score: number;
  maxScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarkChanges {
  exam?: Exam;
  subject?: string;
  score?: number;
  maxScore?: number;
}

export interface MarkWritableColumns {
  exam?: Exam;
  subject?: string;
  score?: number;
  max_score?: number;
}

export interface SubjectAverage {
  subject: string;
  averagePercentage: number;
  students: number;
}

export interface SubjectAverageFilter {
  className: string;
  exam?: Exam;
  section?: string;
}

/**
 * Snake_case row. score and max_score stay strings here because node-pg
 * returns NUMERIC as text. The repository converts them to numbers.
 */
export interface MarkRow {
  id: number;
  student_id: number;
  exam: Exam;
  subject: string;
  score: string;
  max_score: string;
  created_at: Date;
  updated_at: Date;
}

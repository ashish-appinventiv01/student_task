import { env } from '../../config/env';
import { notFound } from '../../errors/AppError';
import {
  mergedMarkScore,
  type AveragesQueryDto,
  type CreateMarksDto,
  type MarkResponseDto,
  type SubjectAverageResponseDto,
  type UpdateMarkDto,
} from './mark.dto';
import type { Mark, SubjectAverage } from './mark.interface';
import * as markRepository from './mark.repository';

const round2 = (value: number): number => Math.round(value * 100) / 100;

export const toResponseDto = (mark: Mark): MarkResponseDto => ({
  id: mark.id,
  studentId: mark.studentId,
  exam: mark.exam,
  subject: mark.subject,
  score: mark.score,
  maxScore: mark.maxScore,
  createdAt: mark.createdAt.toISOString(),
  updatedAt: mark.updatedAt.toISOString(),
});

export const toAverageDto = (average: SubjectAverage, passPercentage: number): SubjectAverageResponseDto => {
  const averagePercentage = round2(average.averagePercentage);
  return {
    subject: average.subject,
    averagePercentage,
    students: average.students,
    passed: averagePercentage >= passPercentage,
  };
};

export const createMarks = async (studentId: number, dto: CreateMarksDto): Promise<MarkResponseDto[]> => {
  const marks = await markRepository.insertMany(studentId, dto.exam, dto.marks);
  return marks.map(toResponseDto);
};

export const updateMark = async (id: number, dto: UpdateMarkDto): Promise<MarkResponseDto> => {
  const existing = await markRepository.findById(id);
  if (!existing) throw notFound(`Mark ${id} not found`);

  mergedMarkScore.parse({
    score: dto.score ?? existing.score,
    maxScore: dto.maxScore ?? existing.maxScore,
  });

  const updated = await markRepository.update(id, dto);
  if (!updated) throw notFound(`Mark ${id} not found`);
  return toResponseDto(updated);
};

export const deleteMark = async (id: number): Promise<void> => {
  const deleted = await markRepository.remove(id);
  if (!deleted) throw notFound(`Mark ${id} not found`);
};

export const getSubjectAverages = async (query: AveragesQueryDto): Promise<SubjectAverageResponseDto[]> => {
  const rows = await markRepository.subjectAverages(query);
  return rows.map((row) => toAverageDto(row, env.PASS_PERCENTAGE));
};

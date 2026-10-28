import { env } from '../../../config/env';
import { forbidden, notFound } from '../../../errors/AppError';
import type { AccessActor } from '../../middlewares/authorize';
import { averageSections, canAccessStudent } from '../access/access.service';
import * as studentRepository from '../student/student.repository';
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

const studentInScope = async (actor: AccessActor, studentId: number, missing: string): Promise<void> => {
  const student = await studentRepository.findById(studentId);
  if (!student || !(await canAccessStudent(actor, student, 'write'))) throw notFound(missing);
};

export const createMarks = async (
  actor: AccessActor,
  studentId: number,
  dto: CreateMarksDto,
): Promise<MarkResponseDto[]> => {
  await studentInScope(actor, studentId, `Student ${studentId} not found`);
  const marks = await markRepository.insertMany(studentId, dto.exam, dto.marks);
  return marks.map(toResponseDto);
};

export const updateMark = async (actor: AccessActor, id: number, dto: UpdateMarkDto): Promise<MarkResponseDto> => {
  const existing = await markRepository.findById(id);
  if (!existing) throw notFound(`Mark ${id} not found`);
  await studentInScope(actor, existing.studentId, `Mark ${id} not found`);

  mergedMarkScore.parse({
    score: dto.score ?? existing.score,
    maxScore: dto.maxScore ?? existing.maxScore,
  });

  const updated = await markRepository.update(id, dto);
  if (!updated) throw notFound(`Mark ${id} not found`);
  return toResponseDto(updated);
};

export const deleteMark = async (actor: AccessActor, id: number): Promise<void> => {
  const existing = await markRepository.findById(id);
  if (!existing) throw notFound(`Mark ${id} not found`);
  await studentInScope(actor, existing.studentId, `Mark ${id} not found`);

  const deleted = await markRepository.remove(id);
  if (!deleted) throw notFound(`Mark ${id} not found`);
};

export const getSubjectAverages = async (
  actor: AccessActor,
  query: AveragesQueryDto,
): Promise<SubjectAverageResponseDto[]> => {
  const sections = await averageSections(actor, query.className, query.section);
  if (sections === false) throw forbidden('You cannot view averages for that class');

  const rows = await markRepository.subjectAverages({
    className: query.className,
    exam: query.exam,
    section: sections === null ? query.section : undefined,
    sections: sections === null ? undefined : sections,
  });
  return rows.map((row) => toAverageDto(row, env.PASS_PERCENTAGE));
};

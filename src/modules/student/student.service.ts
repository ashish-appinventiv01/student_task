import { notFound } from '../../../errors/AppError';
import type { AccessActor } from '../../middlewares/authorize';
import { formatDateOnly } from '../../utils/validators';
import { canAccessStudent, studentReadConstraint } from '../access/access.service';
import type { CreateStudentDto, ListStudentsQueryDto, StudentResponseDto, UpdateStudentDto } from './student.dto';
import type { Student } from './student.interface';
import * as studentRepository from './student.repository';

export const toResponseDto = (student: Student): StudentResponseDto => ({
  id: student.id,
  rollNo: student.rollNo,
  firstName: student.firstName,
  lastName: student.lastName,
  dateOfBirth: formatDateOnly(student.dateOfBirth),
  className: student.className,
  section: student.section,
  guardian: { ...student.guardian },
  createdAt: student.createdAt.toISOString(),
  updatedAt: student.updatedAt.toISOString(),
});

export const listStudents = async (actor: AccessActor, query: ListStudentsQueryDto): Promise<StudentResponseDto[]> => {
  const constraint = await studentReadConstraint(actor);
  if (constraint.kind === 'none') return [];

  const students = await studentRepository.findMany({
    className: query.className,
    section: query.section,
    search: query.search,
    limit: query.limit,
    offset: query.offset,
    ...(constraint.kind === 'class' ? { classes: constraint.classes } : {}),
    ...(constraint.kind === 'own' ? { studentId: constraint.studentId } : {}),
  });
  return students.map(toResponseDto);
};

export const findStudent = async (actor: AccessActor, id: number): Promise<StudentResponseDto> => {
  const student = await studentRepository.findById(id);
  if (!student || !(await canAccessStudent(actor, student, 'read'))) {
    throw notFound(`Student ${id} not found`);
  }
  return toResponseDto(student);
};

export const createStudent = async (dto: CreateStudentDto): Promise<StudentResponseDto> =>
  toResponseDto(await studentRepository.insert(dto));

export const updateStudent = async (actor: AccessActor, id: number, dto: UpdateStudentDto): Promise<StudentResponseDto> => {
  const existing = await studentRepository.findById(id);
  if (!existing || !(await canAccessStudent(actor, existing, 'write'))) {
    throw notFound(`Student ${id} not found`);
  }

  const updated = await studentRepository.update(id, dto);
  if (!updated) throw notFound(`Student ${id} not found`);
  return toResponseDto(updated);
};

export const deleteStudent = async (actor: AccessActor, id: number): Promise<void> => {
  const existing = await studentRepository.findById(id);
  if (!existing || !(await canAccessStudent(actor, existing, 'write'))) {
    throw notFound(`Student ${id} not found`);
  }

  const deleted = await studentRepository.remove(id);
  if (!deleted) throw notFound(`Student ${id} not found`);
};

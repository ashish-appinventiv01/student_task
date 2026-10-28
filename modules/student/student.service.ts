import { notFound } from '../../errors/AppError';
import { formatDateOnly } from '../../src/utils/validators';
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

export const listStudents = async (query: ListStudentsQueryDto): Promise<StudentResponseDto[]> => {
  const students = await studentRepository.findMany({
    className: query.className,
    section: query.section,
    search: query.search,
    limit: query.limit,
    offset: query.offset,
  });
  return students.map(toResponseDto);
};

export const findStudent = async (id: number): Promise<StudentResponseDto> => {
  const student = await studentRepository.findById(id);
  if (!student) throw notFound(`Student ${id} not found`);
  return toResponseDto(student);
};

export const createStudent = async (dto: CreateStudentDto): Promise<StudentResponseDto> =>
  toResponseDto(await studentRepository.insert(dto));

export const updateStudent = async (id: number, dto: UpdateStudentDto): Promise<StudentResponseDto> => {
  const updated = await studentRepository.update(id, dto);
  if (!updated) throw notFound(`Student ${id} not found`);
  return toResponseDto(updated);
};

export const deleteStudent = async (id: number): Promise<void> => {
  const deleted = await studentRepository.remove(id);
  if (!deleted) throw notFound(`Student ${id} not found`);
};

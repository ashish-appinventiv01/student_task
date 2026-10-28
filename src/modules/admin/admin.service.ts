import { badRequest, conflict, notFound } from '../../../errors/AppError';
import { postgresErrorCode } from '../../../errors/pg';
import { hasPermission } from '../../config/permissions';
import type { StudentLinkDto, StudentLinkResponse, TeacherClassDto, TeacherClassResponse } from './admin.dto';
import * as adminRepository from './admin.repository';

export const linkTeacherClass = async (dto: TeacherClassDto): Promise<TeacherClassResponse> => {
  const user = await adminRepository.findUserById(dto.teacherUserId);
  if (!user) throw notFound('User not found');
  if (!hasPermission(user.role, 'teach:class')) {
    throw badRequest('Only a teacher account can be linked to a class');
  }

  try {
    return await adminRepository.insertTeacherClass(dto);
  } catch (err) {
    if (postgresErrorCode(err) === '23505') throw conflict('That class is already linked to this teacher');
    throw err;
  }
};

export const linkStudentAccount = async (dto: StudentLinkDto): Promise<StudentLinkResponse> => {
  const user = await adminRepository.findUserById(dto.userId);
  if (!user) throw notFound('User not found');
  const student = await adminRepository.findStudentById(dto.studentId);
  if (!student) throw notFound('Student not found');
  if (!hasPermission(user.role, 'study:record')) {
    throw badRequest('Only a student account can be linked to a student record');
  }
  if (user.studentId !== null) throw conflict('That account is already linked to a student');

  try {
    const linked = await adminRepository.linkStudent(dto.userId, dto.studentId);
    if (!linked) throw conflict('That account is already linked to a student');
    return linked;
  } catch (err) {
    if (postgresErrorCode(err) === '23505') throw conflict('That student is already linked to an account');
    throw err;
  }
};

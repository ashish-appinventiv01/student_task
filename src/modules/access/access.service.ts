import { hasPermission, type Permission, type Role } from '../../config/permissions';
import type { AccessActor } from '../../middlewares/authorize';
import * as accessRepository from './access.repository';
import type { ClassAssignment } from './access.repository';

export interface ScopedStudent {
  id: number;
  className: string;
  section: string;
}

export type StudentReadConstraint =
  | { kind: 'any' }
  | { kind: 'class'; classes: ClassAssignment[] }
  | { kind: 'own'; studentId: number | null }
  | { kind: 'none' };

const holds = (role: Role, permissions: readonly Permission[]): boolean =>
  permissions.some((permission) => hasPermission(role, permission));

const sameClass = (assignment: ClassAssignment, student: Pick<ScopedStudent, 'className' | 'section'>): boolean =>
  assignment.className === student.className && assignment.section === student.section;

/** Who a list may contain. Shared with canAccessStudent so both follow one scope order. */
export const studentReadConstraint = async (actor: AccessActor): Promise<StudentReadConstraint> => {
  if (hasPermission(actor.role, 'students:read:any')) return { kind: 'any' };
  if (hasPermission(actor.role, 'students:read:class')) {
    return { kind: 'class', classes: await accessRepository.findTeacherClasses(actor.id) };
  }
  if (hasPermission(actor.role, 'students:read:own')) {
    return { kind: 'own', studentId: await accessRepository.findLinkedStudentId(actor.id) };
  }
  return { kind: 'none' };
};

/**
 * One scope check for student and mark services.
 * :any wins, then :class via teacher_classes, then :own via users.student_id.
 */
export const canAccessStudent = async (
  actor: AccessActor,
  student: ScopedStudent,
  action: 'read' | 'write',
): Promise<boolean> => {
  if (action === 'read') {
    const constraint = await studentReadConstraint(actor);
    if (constraint.kind === 'any') return true;
    if (constraint.kind === 'class') return constraint.classes.some((assignment) => sameClass(assignment, student));
    if (constraint.kind === 'own') return constraint.studentId === student.id;
    return false;
  }

  if (holds(actor.role, ['students:write:any', 'marks:write:any'])) return true;
  if (holds(actor.role, ['marks:write:class'])) {
    const classes = await accessRepository.findTeacherClasses(actor.id);
    return classes.some((assignment) => sameClass(assignment, student));
  }
  return false;
};

/**
 * null: every section of the class. string[]: only those sections.
 * false: this caller may not average that class.
 */
export const averageSections = async (
  actor: AccessActor,
  className: string,
  section?: string,
): Promise<string[] | null | false> => {
  if (hasPermission(actor.role, 'marks:averages:any')) return null;
  if (!hasPermission(actor.role, 'marks:averages:class')) return false;

  const classes = await accessRepository.findTeacherClasses(actor.id);
  const matched = classes.filter(
    (assignment) => assignment.className === className && (section === undefined || assignment.section === section),
  );
  if (matched.length === 0) return false;
  return matched.map((assignment) => assignment.section);
};

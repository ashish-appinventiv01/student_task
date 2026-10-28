export const ROLES = ['user', 'moderator', 'admin', 'teacher', 'student'] as const;
export type Role = (typeof ROLES)[number];

/**
 * teach:class and study:record identify a teacher or student account.
 * Admin is granted every school action, but not those two: an admin login
 * is not a teacher or a student, so it cannot be linked as one.
 */
export const PERMISSIONS = [
  'students:read:own',
  'students:read:class',
  'students:read:any',
  'students:write:any',
  'marks:read:own',
  'marks:read:class',
  'marks:read:any',
  'marks:write:class',
  'marks:write:any',
  'marks:averages:class',
  'marks:averages:any',
  'accounts:link',
  'teach:class',
  'study:record',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const grants: Record<Role, readonly Permission[]> = {
  user: [],
  moderator: [],
  admin: [
    'students:read:own',
    'students:read:class',
    'students:read:any',
    'students:write:any',
    'marks:read:own',
    'marks:read:class',
    'marks:read:any',
    'marks:write:class',
    'marks:write:any',
    'marks:averages:class',
    'marks:averages:any',
    'accounts:link',
  ],
  teacher: [
    'students:read:class',
    'marks:read:class',
    'marks:write:class',
    'marks:averages:class',
    'teach:class',
  ],
  student: ['students:read:own', 'marks:read:own', 'study:record'],
};

export const isRole = (value: string): value is Role =>
  (ROLES as readonly string[]).includes(value);

export const hasPermission = (role: Role, permission: Permission): boolean =>
  grants[role].includes(permission);

export const can = (actor: { role: Role } | undefined, permission: Permission): boolean =>
  actor !== undefined && hasPermission(actor.role, permission);

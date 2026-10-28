export type GuardianRelation = 'father' | 'mother' | 'guardian';

export interface Guardian {
  name: string;
  phone: string;
  relation: GuardianRelation;
}

export interface Student {
  id: number;
  rollNo: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  className: string;
  section: string;
  guardian: Guardian;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentChanges {
  rollNo?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  className?: string;
  section?: string;
  guardian?: Guardian;
}

export interface StudentWritableColumns {
  roll_no?: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  class_name?: string;
  section?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_relation?: GuardianRelation;
}

/** Snake_case row. Guardian columns stay flat until the repository maps them. */
export interface StudentRow {
  id: number;
  roll_no: string;
  first_name: string;
  last_name: string;
  date_of_birth: Date | string;
  class_name: string;
  section: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_relation: string;
  created_at: Date;
  updated_at: Date;
}

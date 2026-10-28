-- School records. Guardian is stored flat; repositories nest it back into guardian.
-- score and max_score are NUMERIC, so node-pg returns them as strings.

CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  roll_no VARCHAR(32) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  class_name VARCHAR(2) NOT NULL CHECK (class_name IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12')),
  section VARCHAR(1) NOT NULL CHECK (section IN ('A', 'B', 'C', 'D', 'E', 'F')),
  guardian_name VARCHAR(100) NOT NULL,
  guardian_phone VARCHAR(16) NOT NULL CHECK (guardian_phone ~ '^\+[1-9][0-9]{1,14}$'),
  guardian_relation VARCHAR(10) NOT NULL CHECK (guardian_relation IN ('father', 'mother', 'guardian')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marks (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  exam VARCHAR(10) NOT NULL CHECK (exam IN ('unit-1', 'midterm', 'unit-2', 'final')),
  subject VARCHAR(50) NOT NULL CHECK (subject ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  score NUMERIC(5, 2) NOT NULL,
  max_score NUMERIC(5, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, exam, subject),
  CHECK (max_score >= 1 AND max_score <= 200),
  CHECK (score >= 0 AND score <= max_score)
);

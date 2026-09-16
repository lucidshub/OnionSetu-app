-- SAFE MIGRATION: Fix grading — URS is NOT a grade. Grades are A/B/C/Reject, URS is separate %.
-- Run in Supabase SQL Editor. Preserves existing data.

-- 1. Assessments: add grade_b, grade_c, grade_reject columns (keep grade_a, urs)
alter table public.assessments add column if not exists grade_b int default 0 check (grade_b between 0 and 100);
alter table public.assessments add column if not exists grade_c int default 0 check (grade_c between 0 and 100);
alter table public.assessments add column if not exists grade_reject int default 0 check (grade_reject between 0 and 100);

-- Backfill existing rows: if grade_a + urs = 100, keep as is; grade_b/c/reject remain 0
-- No data loss.

-- 2. assessment_onions: fix grade constraint — must be Grade A/B/C/Reject, not URS
-- First, update any existing 'URS' rows to 'Reject' (URS was incorrectly stored as grade)
update public.assessment_onions set grade = 'Reject' where grade = 'URS';

-- Drop old check constraint (name may vary, so find it)
do $$
declare r record;
begin
  for r in select conname from pg_constraint where conrelid = 'public.assessment_onions'::regclass and contype = 'c' loop
    if r.conname like '%grade%' then
      execute 'alter table public.assessment_onions drop constraint ' || quote_ident(r.conname);
    end if;
  end loop;
end $$;

-- Add correct constraint
alter table public.assessment_onions add constraint assessment_onions_grade_check check (grade in ('Grade A','Grade B','Grade C','Reject'));

-- 3. Verify
-- select grade, count(*) from public.assessment_onions group by grade;
-- select id, grade_a, grade_b, grade_c, grade_reject, urs from public.assessments limit 5;

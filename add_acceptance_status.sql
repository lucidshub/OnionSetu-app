-- Add lot acceptance status: Accepted / Rejected (manual by grader)
alter table public.assessments add column if not exists acceptance_status text not null default 'Accepted' check (acceptance_status in ('Accepted','Rejected'));
-- For existing rows, keep Accepted as default
-- Add index for filtering
create index if not exists idx_assessments_acceptance on public.assessments(acceptance_status);

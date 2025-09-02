-- Row Level Security for Strength & Conditioning tables
-- Per-user privacy policies

alter table sc_plans enable row level security;
alter table sc_plan_sessions enable row level security;
alter table sc_completions enable row level security;

create policy "own plans" on sc_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "plan sessions by owner" on sc_plan_sessions
for select using (exists(select 1 from sc_plans p where p.id = plan_id and p.user_id = auth.uid()));

create policy "insert plan sessions by owner" on sc_plan_sessions
for insert with check (exists(select 1 from sc_plans p where p.id = plan_id and p.user_id = auth.uid()));

create policy "delete plan sessions by owner" on sc_plan_sessions
for delete using (exists(select 1 from sc_plans p where p.id = plan_id and p.user_id = auth.uid()));

create policy "own completions" on sc_completions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

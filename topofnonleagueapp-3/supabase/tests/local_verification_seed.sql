-- ⚠️  LOCAL/DEV VERIFICATION ONLY.
-- This inserts fake rows directly into auth.users, which only works against a
-- local Postgres instance (or `supabase start` local dev stack). Do NOT run
-- this against your live hosted Supabase project — you cannot and should not
-- insert directly into a hosted project's auth.users table.
-- Purpose: proves the schema, the "max 2 picks per team" trigger, and the
-- standings view all compute correctly, independent of the app code.

-- Local verification seed — NOT part of the shipped migration.
-- Creates 4 teams, 2 gameweeks, fixtures + results, 2 profiles with picks,
-- then checks the standings view against hand-calculated expected values.

insert into public.teams (id, name) values
  ('11111111-1111-1111-1111-111111111111', 'Aveley'),
  ('22222222-2222-2222-2222-222222222222', 'Folkestone Invicta'),
  ('33333333-3333-3333-3333-333333333333', 'Dartford'),
  ('44444444-4444-4444-4444-444444444444', 'Lewes');

insert into public.gameweeks (id, number) values
  ('a1111111-0000-0000-0000-000000000001', 1),
  ('a1111111-0000-0000-0000-000000000002', 2);

-- GW1: Aveley 3-1 Folkestone, Dartford 0-0 Lewes
insert into public.fixtures (id, gameweek_id, home_team_id, away_team_id) values
  ('b0000000-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'),
  ('b0000000-0000-0000-0000-000000000002', 'a1111111-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444');
insert into public.results (fixture_id, home_goals, away_goals) values
  ('b0000000-0000-0000-0000-000000000001', 3, 1),
  ('b0000000-0000-0000-0000-000000000002', 0, 0);

-- GW2: Folkestone 2-2 Aveley, Lewes 1-4 Dartford
insert into public.fixtures (id, gameweek_id, home_team_id, away_team_id) values
  ('b0000000-0000-0000-0000-000000000003', 'a1111111-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'),
  ('b0000000-0000-0000-0000-000000000004', 'a1111111-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333');
insert into public.results (fixture_id, home_goals, away_goals) values
  ('b0000000-0000-0000-0000-000000000003', 2, 2),
  ('b0000000-0000-0000-0000-000000000004', 1, 4);

insert into auth.users (id) values
  ('c0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000002');
insert into public.profiles (id, team_name) values
  ('c0000000-0000-0000-0000-000000000001', 'Alice XI'),
  ('c0000000-0000-0000-0000-000000000002', 'Bob United');

-- Alice: GW1 picks Aveley (win 3-1 -> 3pts, GF3 GA1), GW2 picks Aveley again (draw 2-2 -> 1pt, GF2 GA2)
insert into public.picks (profile_id, gameweek_id, team_id) values
  ('c0000000-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111'),
  ('c0000000-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111');

-- Bob: GW1 picks Dartford (draw 0-0 -> 1pt), GW2 picks Dartford again (win 4-1 -> 3pts, GF4 GA1)
insert into public.picks (profile_id, gameweek_id, team_id) values
  ('c0000000-0000-0000-0000-000000000002', 'a1111111-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333'),
  ('c0000000-0000-0000-0000-000000000002', 'a1111111-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333');

-- Expected: Alice = 4 pts, played 2, W1 D1 L0, GF5 GA3, GD+2
--           Bob   = 4 pts, played 2, W1 D1 L0, GF4 GA1, GD+3  (Bob should rank above Alice on GD)
select * from public.standings order by points desc, goal_difference desc;

-- Trigger check: this THIRD pick of Aveley by Alice must be rejected.
\echo 'Expecting an error below (3rd pick of same team must be blocked):'
insert into public.gameweeks (id, number) values ('a1111111-0000-0000-0000-000000000003', 3);
insert into public.picks (profile_id, gameweek_id, team_id) values
  ('c0000000-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111');

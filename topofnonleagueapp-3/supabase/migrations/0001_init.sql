-- =========================================================================
-- Top of Non League — initial schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a
-- fresh project. Designed for Postgres 15+ / Supabase.
-- =========================================================================

-- ---------------------------------------------------------------------
-- Reference data: teams playing in a given non-league division & season.
-- Kept generic (league_slug) so more divisions can be added later without
-- a schema change — this is what lets the product grow across the
-- non-league pyramid.
-- ---------------------------------------------------------------------
create table if not exists public.teams (
  id            uuid primary key default gen_random_uuid(),
  league_slug   text not null default 'isthmian-premier',
  name          text not null,
  short_name    text,
  created_at    timestamptz not null default now(),
  unique (league_slug, name)
);

create table if not exists public.gameweeks (
  id            uuid primary key default gen_random_uuid(),
  league_slug   text not null default 'isthmian-premier',
  season        text not null default '2026-27',
  number        int not null,
  -- picks lock at this timestamp (kickoff of the gameweek's first fixture)
  deadline_at   timestamptz,
  created_at    timestamptz not null default now(),
  unique (league_slug, season, number)
);

create table if not exists public.fixtures (
  id            uuid primary key default gen_random_uuid(),
  gameweek_id   uuid not null references public.gameweeks(id) on delete cascade,
  home_team_id  uuid not null references public.teams(id),
  away_team_id  uuid not null references public.teams(id),
  kickoff_at    timestamptz,
  source_ref    text, -- external id/slug from the data source, for de-duping on re-ingest
  created_at    timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);
create index if not exists fixtures_gameweek_idx on public.fixtures(gameweek_id);

create table if not exists public.results (
  fixture_id    uuid primary key references public.fixtures(id) on delete cascade,
  home_goals    int not null check (home_goals >= 0),
  away_goals    int not null check (away_goals >= 0),
  status        text not null default 'FT', -- FT, POSTPONED, ABANDONED
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Player profiles — one row per signed-up user, keyed to Supabase auth.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  team_name     text not null,
  league_slug   text not null default 'isthmian-premier',
  created_at    timestamptz not null default now(),
  constraint team_name_length check (char_length(team_name) between 2 and 24)
);

-- ---------------------------------------------------------------------
-- Picks — one team picked per gameweek per user.
-- The "max twice per team per season" rule is enforced two ways:
--   1) a unique constraint stops more than one pick per gameweek
--   2) a trigger (below) stops a 3rd pick of the same team
-- ---------------------------------------------------------------------
create table if not exists public.picks (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  gameweek_id   uuid not null references public.gameweeks(id) on delete cascade,
  team_id       uuid not null references public.teams(id),
  created_at    timestamptz not null default now(),
  unique (profile_id, gameweek_id)
);
create index if not exists picks_profile_idx on public.picks(profile_id);

create or replace function public.enforce_pick_team_limit()
returns trigger as $$
declare
  existing_count int;
begin
  select count(*) into existing_count
  from public.picks
  where profile_id = new.profile_id
    and team_id = new.team_id
    and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if existing_count >= 2 then
    raise exception 'Team already picked twice this season' using errcode = 'P0001';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists picks_team_limit on public.picks;
create trigger picks_team_limit
  before insert or update on public.picks
  for each row execute function public.enforce_pick_team_limit();

-- ---------------------------------------------------------------------
-- Standings — computed live from picks + results. No separate scoring
-- job to keep in sync: as soon as a result lands in `results`, every
-- profile who picked either team in that fixture is scored correctly
-- the next time this view is read.
-- ---------------------------------------------------------------------
create or replace view public.standings as
with scored_picks as (
  select
    p.profile_id,
    p.gameweek_id,
    p.team_id,
    case when f.home_team_id = p.team_id then r.home_goals else r.away_goals end as goals_for,
    case when f.home_team_id = p.team_id then r.away_goals else r.home_goals end as goals_against
  from public.picks p
  join public.fixtures f
    on f.gameweek_id = p.gameweek_id
   and (f.home_team_id = p.team_id or f.away_team_id = p.team_id)
  join public.results r on r.fixture_id = f.id
)
select
  pr.id as profile_id,
  pr.team_name,
  pr.league_slug,
  count(sp.*)::int as played,
  count(*) filter (where sp.goals_for > sp.goals_against)::int as won,
  count(*) filter (where sp.goals_for = sp.goals_against)::int as drawn,
  count(*) filter (where sp.goals_for < sp.goals_against)::int as lost,
  coalesce(sum(sp.goals_for), 0)::int as goals_for,
  coalesce(sum(sp.goals_against), 0)::int as goals_against,
  coalesce(sum(sp.goals_for) - sum(sp.goals_against), 0)::int as goal_difference,
  (
    count(*) filter (where sp.goals_for > sp.goals_against) * 3
    + count(*) filter (where sp.goals_for = sp.goals_against) * 1
  )::int as points
from public.profiles pr
left join scored_picks sp on sp.profile_id = pr.id
group by pr.id, pr.team_name, pr.league_slug;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.teams enable row level security;
alter table public.gameweeks enable row level security;
alter table public.fixtures enable row level security;
alter table public.results enable row level security;
alter table public.profiles enable row level security;
alter table public.picks enable row level security;

-- Public read access to league/fixture/result data — this is a public
-- game, everyone should see fixtures, results and the table.
create policy "public read teams" on public.teams for select using (true);
create policy "public read gameweeks" on public.gameweeks for select using (true);
create policy "public read fixtures" on public.fixtures for select using (true);
create policy "public read results" on public.results for select using (true);

-- Profiles: anyone signed in can read team names (needed for the league
-- table), but you can only create/edit your own.
create policy "public read profiles" on public.profiles for select using (true);
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "update own profile" on public.profiles for update using (auth.uid() = id);

-- Picks: everyone can read (needed to compute/display standings), but
-- you can only create/edit your own picks.
create policy "public read picks" on public.picks for select using (true);
create policy "insert own picks" on public.picks for insert with check (auth.uid() = profile_id);
create policy "update own picks" on public.picks for update using (auth.uid() = profile_id);

-- Writes to teams/gameweeks/fixtures/results are done by the server-side
-- ingestion route using the Supabase service role key, which bypasses RLS,
-- so no public write policies are defined for those tables.

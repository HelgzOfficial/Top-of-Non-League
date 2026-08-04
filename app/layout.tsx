-- =========================================================================
-- Top of Non League — squad number colour
--
-- Adds a separate colour for the number printed on the shirt (previously
-- always plain white), and extends `standings` again so the Table tab's
-- mini shirt renders with the right number colour too.
--
-- Paste this whole file into the Supabase SQL Editor and click Run.
-- Safe to re-run.
-- =========================================================================

alter table public.profiles
  add column if not exists shirt_number_color text not null default '#ffffff';

-- Appended at the very end of the select list (same reason as
-- 0004_profile_customization.sql: CREATE OR REPLACE VIEW can only add
-- columns at the end, not insert them in the middle).
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
  )::int as points,
  pr.shirt_style,
  pr.shirt_color,
  pr.shirt_trim_color,
  pr.shirt_number,
  pr.shirt_number_color
from public.profiles pr
left join scored_picks sp on sp.profile_id = pr.id
group by
  pr.id, pr.team_name, pr.league_slug,
  pr.shirt_style, pr.shirt_color, pr.shirt_trim_color, pr.shirt_number, pr.shirt_number_color;

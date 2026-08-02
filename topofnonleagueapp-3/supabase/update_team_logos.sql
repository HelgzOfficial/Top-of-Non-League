-- Points each team at its crest image. Run this any time you add new logo
-- files — safe to re-run, and safe to run with only some teams filled in
-- (teams without a row here just keep showing the text-initials badge).
--
-- To add a team: drop its logo PNG into public/team-logos/ in the project
-- (transparent background, roughly square, 256x256 is plenty), redeploy,
-- then add a matching line below and run it here.

update public.teams set logo_path = '/team-logos/afc-whyteleafe.png'
  where league_slug = 'isthmian-premier' and name = 'AFC Whyteleafe';

update public.teams set logo_path = '/team-logos/aveley.png'
  where league_slug = 'isthmian-premier' and name = 'Aveley';

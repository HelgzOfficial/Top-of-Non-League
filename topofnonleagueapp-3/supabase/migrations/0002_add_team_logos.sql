-- Adds crest/logo support to teams. Run this in the Supabase SQL editor
-- AFTER 0001_init.sql (safe to run even if you already seeded fixtures —
-- this only adds a new nullable column, nothing existing changes).

alter table public.teams add column if not exists logo_path text;

comment on column public.teams.logo_path is
  'Path under /public in the Next.js app, e.g. "/team-logos/aveley.png". Null means no crest yet — the UI falls back to a text-initials badge.';

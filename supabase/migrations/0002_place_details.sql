-- Migration 0002: free-form details on places (best-time-to-visit cache, etc.)
-- Run in the Supabase SQL editor after schema.sql.
alter table places
  add column if not exists details jsonb not null default '{}'::jsonb;

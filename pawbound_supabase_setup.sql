-- Pawbound v4.6 beta, run ONCE in your Supabase project's SQL Editor.
-- Your public browser key NEVER overrides RLS. Only each signed-in user can access their own backup.
CREATE TABLE IF NOT EXISTS public.pawbound_backups (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  backup jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pawbound_backup_shape CHECK (
    backup ->> 'product' = 'Pawbound' AND
    backup ->> 'format' = 'pawbound-local-backup-v1' AND
    backup ? 'items' AND
    jsonb_typeof(backup -> 'items') = 'object'
  )
);
ALTER TABLE public.pawbound_backups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pawbound_backups FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pawbound_backups TO authenticated;
DROP POLICY IF EXISTS pawbound_backup_select_own ON public.pawbound_backups;
DROP POLICY IF EXISTS pawbound_backup_insert_own ON public.pawbound_backups;
DROP POLICY IF EXISTS pawbound_backup_update_own ON public.pawbound_backups;
DROP POLICY IF EXISTS pawbound_backup_delete_own ON public.pawbound_backups;
CREATE POLICY pawbound_backup_select_own ON public.pawbound_backups
FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY pawbound_backup_insert_own ON public.pawbound_backups
FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY pawbound_backup_update_own ON public.pawbound_backups
FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY pawbound_backup_delete_own ON public.pawbound_backups
FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

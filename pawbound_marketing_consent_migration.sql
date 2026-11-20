-- Pawbound v4.8: email updates are optional, separate from account registration.
-- Signed-in members only read/update their own preference; no public list endpoint.
CREATE TABLE IF NOT EXISTS public.pawbound_marketing_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  opted_in boolean NOT NULL DEFAULT false,
  consented_at timestamptz,
  consent_notice_version text NOT NULL DEFAULT 'pawbound-updates-v1-2026-11-20',
  consent_source text NOT NULL DEFAULT 'account_settings',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pawbound_marketing_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pawbound_marketing_preferences FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public.pawbound_marketing_preferences TO authenticated;

CREATE POLICY marketing_select_own ON public.pawbound_marketing_preferences
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY marketing_insert_own ON public.pawbound_marketing_preferences
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY marketing_update_own ON public.pawbound_marketing_preferences
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Server-assigned consent timestamps. Never use browser-provided timestamps as audit evidence.
CREATE OR REPLACE FUNCTION public.pawbound_stamp_marketing_preference()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  IF TG_OP = 'INSERT' THEN
    NEW.consented_at = CASE WHEN NEW.opted_in THEN now() ELSE NULL END;
  ELSIF NEW.opted_in IS DISTINCT FROM OLD.opted_in THEN
    NEW.consented_at = CASE WHEN NEW.opted_in THEN now() ELSE NULL END;
  ELSE
    NEW.consented_at = OLD.consented_at;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pawbound_marketing_stamp
BEFORE INSERT OR UPDATE ON public.pawbound_marketing_preferences
FOR EACH ROW EXECUTE FUNCTION public.pawbound_stamp_marketing_preference();

-- Capture optional signup choice when auth.users row is first created,
-- even if email confirmation occurs later. This is NOT used for authorization.
CREATE SCHEMA IF NOT EXISTS pawbound_private;
REVOKE ALL ON SCHEMA pawbound_private FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION pawbound_private.capture_signup_marketing_choice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE wants_updates boolean;
BEGIN
  wants_updates := COALESCE(NEW.raw_user_meta_data ->> 'pawbound_marketing_opt_in','false') = 'true';
  INSERT INTO public.pawbound_marketing_preferences
    (user_id, opted_in, consent_source, consent_notice_version)
  VALUES (NEW.id, wants_updates, 'signup', 'pawbound-updates-v1-2026-11-20')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION pawbound_private.capture_signup_marketing_choice() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER pawbound_capture_signup_marketing
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION pawbound_private.capture_signup_marketing_choice();

-- Admin-only list for future email provider synchronization; do not expose as public view:
-- SELECT u.email, p.consented_at FROM auth.users u JOIN public.pawbound_marketing_preferences p
-- ON p.user_id=u.id WHERE p.opted_in AND u.email_confirmed_at IS NOT NULL;

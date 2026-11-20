PAWBOUND v4.6 SUPABASE SETUP — one-time tasks

1. Log in to the Supabase project fjpupvhwqlbjzggbplud.
2. Open SQL Editor → New query. Copy PAWBOUND_SUPABASE_SETUP.sql and click Run.
   This creates a secure pawbound_backups table with row-level security.
3. Go to Authentication → URL Configuration. Set Site URL to your CLAIMED Netlify site's HTTPS URL, e.g. https://flourishing-kheer-1efe60.netlify.app/ ONLY if that's still your claimed site. Add the same URL as an allowed Redirect URL.
4. Authentication → Providers → Email: check Email provider is enabled. Enable Confirm email for production. Email sent from Supabase's default service may be rate-limited; set up custom SMTP before wider beta.
5. On Netlify → Deploys, upload pawbound-v4.6-supabase-beta.zip (this ZIP). Retain the existing domain and export your local backup first.
6. Open Pawbound's menu → My Account & Backups. Create account, confirm email if asked, then sign in.
7. Save a cloud copy on device A, download a LOCAL backup on device B before restoring, then sign in with the same account on B and Restore.

NOTES: This beta is a manually triggered cloud backup and restoration, NOT continuous multi-device sync. Sensitive content is stored in JSONB in your Supabase project; not end-to-end encrypted. Never paste service_role or secret keys into the website. Use only the provided publishable key. No database table is created by deploying the website; the SQL Editor step is mandatory.

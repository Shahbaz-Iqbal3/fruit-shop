# Fruit shop app (Next.js + Supabase)
1. npx create-next-app@latest fruit-shop --ts --tailwind --app --no-src-dir --import-alias "@/*"
2. Copy app/, lib/, supabase/ from this zip into fruit-shop (overwrite). Then: npm i @supabase/supabase-js
3. npm run dev, open http://localhost:3000 (redirects to /setup). Paste the Supabase token, fill the form, wait about 2 minutes.
4. Restart npm run dev. Customers use /, the owner uses /admin (tap "Start taking orders" to arm the alarm).
5. Deploy to Vercel and add the two NEXT_PUBLIC_SUPABASE_* values shown after setup. Run setup locally, not on Vercel.

## Shop branding
Owner > /admin > "Shop branding": name, logo, brand color, WhatsApp number. Existing shops: run `supabase/migrations/001_shop_settings.sql` once in the Supabase SQL editor. New shops get it from setup.

## Phone tracking
Existing database: run `supabase/migrations/002_track_by_phone.sql` once. Customers track orders at `/track` with their phone number.

Existing database: run `supabase/migrations/003_categories.sql` once (categories + faster lists).

## Phone notifications (new order alerts)
New project: `/setup` does everything below automatically (if the function deploy fails, deploy it by hand in step 3).
Existing project:
1. Run `supabase/migrations/005_push_notifications.sql` in the SQL editor.
2. Make keys: `npx web-push generate-vapid-keys`.
3. Supabase > Edge Functions > deploy new function `notify-order`, paste `supabase/functions/notify-order/index.ts`, turn **Verify JWT off**.
4. Edge Functions > Secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:you@example.com`).
5. SQL editor: `insert into app_config(key,value) values('notify_url','https://YOUR-REF.supabase.co/functions/v1/notify-order') on conflict (key) do update set value = excluded.value;`
6. Add `NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public key>` to `.env.local` and Vercel, then redeploy.
7. On the owner phone open `/admin` (https), iPhone: Share > Add to Home Screen, then Shop > Notifications > turn on.

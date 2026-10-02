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

# Supabase Database Setup

## Applying Migrations

Run `supabase db push` or paste each file into the Supabase SQL editor in filename order:

1. `migrations/20240101000000_initial_schema.sql` — Tables, triggers, and functions
2. `migrations/20240101000001_rls_policies.sql` — Row Level Security policies
3. `migrations/20240101000002_create_board_with_template.sql` — Postgres function `create_board_with_template`; required for atomic board + template card creation

## Manual Realtime Step (Critical)

Realtime must be enabled manually in the Supabase dashboard — it cannot be applied via SQL migration:

1. Go to Supabase Dashboard → **Table Editor**
2. Select the `cards` table → enable the **Realtime** toggle
3. Select the `drawing_paths` table → enable the **Realtime** toggle

Without this step, live collaboration will not work.

## Seed Data

Run `supabase db seed` or paste `seed.sql` into the SQL editor. This is for **local development only**.

Before running, replace the `owner_id` placeholder (`00000000-0000-0000-0000-000000000000`) with an actual user UUID from your `auth.users` table.

## Environment Variables

After setup, configure these in your `.env.local`:

- `DEMO_BOARD_ID=00000000-0000-0000-0000-000000000001`
- `DEMO_VIEW_TOKEN` = UUID of the view share token generated for the demo board after setup

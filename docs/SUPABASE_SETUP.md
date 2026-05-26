# Supabase Setup

Habit Loop Lab is local-first. Supabase is optional and only needed when you want the same data on multiple devices.

## Current Project

The app is already configured with this Supabase project:

```text
https://rzpdqrcfqxpgpjstfxau.supabase.co
```

The client uses a Supabase publishable key in the frontend. That is expected for browser apps. Never add a service role key to this repository.

## 1. Create Or Open The Supabase Project

1. Go to [Supabase](https://supabase.com).
2. Open the project listed above, or create a new one if you want to replace it.
3. Open **Project Settings > API**.
4. If you replace the project, copy:
   - Project URL
   - anon public key or publishable key

Those values are public client-side values. Do not use the service role key in the app.

## 2. Enable Email Auth

In **Authentication > Providers**, make sure **Email** is enabled.

For easiest testing, you can temporarily disable email confirmation. For production-style behavior, keep confirmation enabled.

If the app says `Email not confirmed`, the account exists but Supabase is waiting for the user to confirm the email address. Check inbox and spam, or use **Reenviar confirmación** from the app login panel. For fast local testing, disable **Confirm email** in the Email provider settings and turn it back on when you want production-style behavior.

## 3. Create The Sync Table

Open **SQL Editor** and run:

```sql
create table if not exists public.habit_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.habit_states enable row level security;

create policy "Users can read their own habit state"
on public.habit_states
for select
using (auth.uid() = user_id);

create policy "Users can insert their own habit state"
on public.habit_states
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own habit state"
on public.habit_states
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own habit state"
on public.habit_states
for delete
using (auth.uid() = user_id);
```

## 4. Configure The App

In Habit Loop Lab:

1. Click **Sincronizar**.
2. Create an account or sign in.
3. Use the same account on your phone and computer.

The app already includes the current Project URL and publishable key. Use the configuration form only if you intentionally move to another Supabase project.

## Sync Behavior

- Without login: data stays in the current browser through `localStorage`.
- With login: changes are still saved locally and then uploaded to Supabase.
- On a new device: sign in and click **Descargar nube** if the data does not load automatically.

## Privacy Note

Each user can only read and write their own row because the table uses Supabase Row Level Security.

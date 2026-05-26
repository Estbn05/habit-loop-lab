# Supabase Setup

Habit Loop Lab is local-first. Supabase is optional and only needed when you want the same data on multiple devices.

## 1. Create A Supabase Project

1. Go to [Supabase](https://supabase.com).
2. Create a new project.
3. Open **Project Settings > API**.
4. Copy:
   - Project URL
   - anon public key

Those values are public client-side values. Do not use the service role key in the app.

## 2. Enable Email Auth

In **Authentication > Providers**, make sure **Email** is enabled.

For easiest testing, you can temporarily disable email confirmation. For production-style behavior, keep confirmation enabled.

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
2. Paste your Supabase Project URL.
3. Paste your anon public key.
4. Create an account or sign in.
5. Use the same account on your phone and computer.

## Sync Behavior

- Without login: data stays in the current browser through `localStorage`.
- With login: changes are still saved locally and then uploaded to Supabase.
- On a new device: sign in and click **Descargar nube** if the data does not load automatically.

## Privacy Note

Each user can only read and write their own row because the table uses Supabase Row Level Security.

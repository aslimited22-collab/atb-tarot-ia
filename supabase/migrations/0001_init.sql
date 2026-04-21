create table users (
  id uuid references auth.users primary key,
  email text,
  plan text default 'free',
  kiwify_order_id text,
  messages_today int default 0,
  last_message_date date,
  created_at timestamptz default now()
);

create table chat_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  role text,
  content text,
  created_at timestamptz default now()
);

create table oracle_readings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  card_name text,
  reading_text text,
  date date,
  created_at timestamptz default now()
);

create table journal_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  user_input text,
  ai_response text,
  created_at timestamptz default now()
);

alter table users enable row level security;
alter table chat_messages enable row level security;
alter table oracle_readings enable row level security;
alter table journal_entries enable row level security;

create policy "users own data" on users for all using (auth.uid() = id);
create policy "users own messages" on chat_messages for all using (auth.uid() = user_id);
create policy "users own oracle" on oracle_readings for all using (auth.uid() = user_id);
create policy "users own journal" on journal_entries for all using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

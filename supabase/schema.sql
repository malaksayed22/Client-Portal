-- USERS TABLE
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  identifier text unique not null,
  auth_method text not null,
  name text,
  email text,
  phone text,
  business_name text,
  business_type text,
  bio text,
  location text,
  city text,
  whatsapp text,
  avatar_url text,
  google_id text,
  google_picture text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- SUBMISSIONS TABLE
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  submitted_at timestamptz default now(),
  updated_at timestamptz default now(),
  status text default 'RECEIVED',
  current_stage integer default 0,
  estimated_delivery text,
  client_name text,
  business_name text,
  business_description text,
  customer_type text[],
  unique_value text,
  why_now text,
  success_definition text,
  has_existing_website boolean default false,
  existing_website_feedback text,
  inspired_sites text[],
  inspired_sites_feedback text,
  disliked_site text,
  disliked_site_feedback text,
  pages text[],
  features text[],
  content_responsibility text,
  has_brand_assets boolean default false,
  budget text,
  has_deadline boolean default false,
  deadline text,
  deadline_reason text,
  approver text,
  phone text,
  style_preferences text[],
  foreign key (identifier)
    references users(identifier)
);

-- PROFILE SETTINGS TABLE
create table if not exists profile_settings (
  id uuid primary key default gen_random_uuid(),
  identifier text unique not null,
  notifications jsonb default '{}',
  preferences jsonb default '{}',
  privacy jsonb default '{}',
  updated_at timestamptz default now(),
  foreign key (identifier)
    references users(identifier)
);

alter table users enable row level security;
alter table submissions enable row level security;
alter table profile_settings enable row level security;

create policy if not exists "users_own_data" on users
  for all using (true);

create policy if not exists "submissions_own_data" on submissions
  for all using (true);

create policy if not exists "settings_own_data" on profile_settings
  for all using (true);

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at
  before update on users
  for each row execute function update_updated_at();

create trigger submissions_updated_at
  before update on submissions
  for each row execute function update_updated_at();

create trigger settings_updated_at
  before update on profile_settings
  for each row execute function update_updated_at();

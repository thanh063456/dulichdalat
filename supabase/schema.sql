-- =========================================================
-- Dalat Travel Supabase schema
-- Copy-paste this whole script into the Supabase SQL editor.
-- It matches the current app flow:
-- - chat history uses session_id
-- - user_id is optional
-- - server-side admin client can write bookings/chat history
-- =========================================================

create extension if not exists pgcrypto;

-- Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text unique not null,
  phone text not null default '',
  address text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Chat history table
create table if not exists public.chat_history (
  id bigserial primary key,
  user_id uuid null references public.profiles(id) on delete set null,
  session_id text not null,
  message text not null,
  sender text not null check (sender in ('user', 'bot')),
  created_at timestamptz not null default now()
);

-- Bookings table
create table if not exists public.bookings (
  id bigserial primary key,
  user_id uuid null references public.profiles(id) on delete set null,
  place_name text not null,
  type text not null check (type in ('room', 'table')),
  customer_name text not null,
  phone text not null,
  date_in date not null,
  date_out date,
  time time,
  guests integer not null check (guests > 0),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

-- Admin notifications table
create table if not exists public.admin_notifications (
  id bigserial primary key,
  type text not null default 'new_booking',
  title text not null,
  message text not null,
  booking_id bigint references public.bookings(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Keep updated_at in sync for profiles
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- Create a profile row automatically after auth signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Khách'),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do update
    set name = excluded.name,
        email = excluded.email,
        phone = excluded.phone,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- Helper: check if current user is admin
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
begin
  select (role = 'admin') into is_admin 
  from public.profiles 
  where id = auth.uid();
  
  return coalesce(is_admin, false);
end;
$$;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.chat_history enable row level security;
alter table public.bookings enable row level security;
alter table public.admin_notifications enable row level security;

-- Drop old policies if re-running the script
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists chat_select_own on public.chat_history;
drop policy if exists chat_insert_session on public.chat_history;
drop policy if exists chat_delete_own on public.chat_history;
drop policy if exists bookings_insert on public.bookings;
drop policy if exists bookings_own on public.bookings;
drop policy if exists bookings_update_own on public.bookings;
drop policy if exists admin_notifications_select_admin on public.admin_notifications;
drop policy if exists admin_notifications_update_admin on public.admin_notifications;

-- Profiles policies
drop policy if exists profiles_select on public.profiles;
create policy profiles_select
on public.profiles
for select
using (true); -- Mở quyền đọc profile để tránh lỗi vòng lặp vô hạn (infinite recursion)

drop policy if exists profiles_update on public.profiles;
create policy profiles_update
on public.profiles
for update
using (auth.uid() = id);

-- If you ever create profiles from client-side signup flows, keep this.
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
with check (auth.uid() = id);

-- Chat history policies
-- The app currently writes chat history via server-side admin client, so RLS is mostly for future client-side auth.
drop policy if exists chat_select_own on public.chat_history;
create policy chat_select_own
on public.chat_history
for select
using (auth.uid() = user_id or user_id is null);

drop policy if exists chat_insert_session on public.chat_history;
create policy chat_insert_session
on public.chat_history
for insert
with check (
  user_id is null
  or auth.uid() = user_id
  or public.is_admin()
);

drop policy if exists chat_delete_own on public.chat_history;
create policy chat_delete_own
on public.chat_history
for delete
using (
  auth.uid() = user_id
  or public.is_admin()
);

-- Bookings policies
drop policy if exists bookings_insert on public.bookings;
create policy bookings_insert
on public.bookings
for insert
with check (
  user_id is null
  or auth.uid() = user_id
  or public.is_admin()
);

drop policy if exists bookings_own on public.bookings;
create policy bookings_own
on public.bookings
for select
using (
  auth.uid() = user_id
  or public.is_admin()
);

drop policy if exists bookings_update_own on public.bookings;
create policy bookings_update_own
on public.bookings
for update
using (
  auth.uid() = user_id
  or public.is_admin()
);

-- Admin notifications policies
drop policy if exists admin_notifications_select_admin on public.admin_notifications;
create policy admin_notifications_select_admin
on public.admin_notifications
for select
using (public.is_admin());

drop policy if exists admin_notifications_update_admin on public.admin_notifications;
create policy admin_notifications_update_admin
on public.admin_notifications
for update
using (public.is_admin());

-- Itineraries table
create table if not exists public.itineraries (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  start_date date not null,
  duration_days integer not null check (duration_days > 0),
  itinerary_data jsonb not null,
  share_token text unique,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS policies for itineraries
alter table public.itineraries enable row level security;

drop policy if exists itineraries_own on public.itineraries;
drop policy if exists itineraries_create on public.itineraries;
drop policy if exists itineraries_update_own on public.itineraries;
drop policy if exists itineraries_delete_own on public.itineraries;

create policy itineraries_own
on public.itineraries
for select
using (
  auth.uid() = user_id
  or is_public = true
);

drop policy if exists itineraries_create on public.itineraries;
create policy itineraries_create
on public.itineraries
for insert
with check (
  auth.uid() = user_id
  or public.is_admin()
);

drop policy if exists itineraries_update_own on public.itineraries;
create policy itineraries_update_own
on public.itineraries
for update
using (
  auth.uid() = user_id
  or public.is_admin()
);

drop policy if exists itineraries_delete_own on public.itineraries;
create policy itineraries_delete_own
on public.itineraries
for delete
using (
  auth.uid() = user_id
  or public.is_admin()
);

-- Place reviews table
create table if not exists public.place_reviews (
  id bigserial primary key,
  place_slug text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_name text not null default 'Khách',
  rating integer not null check (rating between 1 and 5),
  content text not null,
  image_url text,
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (place_slug, user_id)
);

alter table public.place_reviews enable row level security;

drop policy if exists place_reviews_select on public.place_reviews;
create policy place_reviews_select
on public.place_reviews
for select
using (
  approved = true
  or auth.uid() = user_id
  or public.is_admin()
);

drop policy if exists place_reviews_insert on public.place_reviews;
create policy place_reviews_insert
on public.place_reviews
for insert
with check (
  auth.uid() = user_id
  or public.is_admin()
);

drop policy if exists place_reviews_update on public.place_reviews;
create policy place_reviews_update
on public.place_reviews
for update
using (
  auth.uid() = user_id
  or public.is_admin()
);

drop policy if exists place_reviews_delete on public.place_reviews;
create policy place_reviews_delete
on public.place_reviews
for delete
using (
  auth.uid() = user_id
  or public.is_admin()
);

-- Keep updated_at in sync for place reviews

drop trigger if exists trg_place_reviews_updated_at on public.place_reviews;
create trigger trg_place_reviews_updated_at
before update on public.place_reviews
for each row
execute function public.set_updated_at();

-- Helpful indexes for reviews
create index if not exists idx_place_reviews_place_slug on public.place_reviews(place_slug);
create index if not exists idx_place_reviews_user_id on public.place_reviews(user_id);
create index if not exists idx_place_reviews_approved on public.place_reviews(approved);

-- Place favorites (user bookmarks)
create table if not exists public.place_favorites (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  place_slug text not null,
  created_at timestamptz not null default now(),
  unique (user_id, place_slug)
);

alter table public.place_favorites enable row level security;

drop policy if exists place_favorites_select on public.place_favorites;
create policy place_favorites_select
on public.place_favorites
for select
using (
  auth.uid() = user_id
  or public.is_admin()
);

drop policy if exists place_favorites_insert on public.place_favorites;
create policy place_favorites_insert
on public.place_favorites
for insert
with check (
  auth.uid() = user_id
  or public.is_admin()
);

drop policy if exists place_favorites_delete on public.place_favorites;
create policy place_favorites_delete
on public.place_favorites
for delete
using (
  auth.uid() = user_id
  or public.is_admin()
);

create index if not exists idx_place_favorites_user_id on public.place_favorites(user_id);
create index if not exists idx_place_favorites_place_slug on public.place_favorites(place_slug);

-- Places catalog
create table if not exists public.places (
  slug text primary key,
  name text not null,
  category text not null default 'Điểm đến',
  rating numeric(3,1) not null default 0,
  review_count integer not null default 0,
  is_hidden boolean not null default false,
  address text not null default '',
  hours text not null default '',
  description text not null default '',
  summary text not null default '',
  image text not null default '',
  tags text[] not null default '{}',
  verified boolean not null default false,
  phone text not null default '',
  gmaps_link text not null default '',
  geo jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_places_updated_at on public.places;
create trigger trg_places_updated_at
before update on public.places
for each row
execute function public.set_updated_at();

create index if not exists idx_places_category on public.places(category);
create index if not exists idx_places_verified on public.places(verified);

-- Blog posts table
create table if not exists public.blog_posts (
  id bigserial primary key,
  author_id uuid not null references public.profiles(id) on delete cascade,
  slug text unique not null,
  title text not null,
  excerpt text not null,
  content text not null,
  cover_image text not null,
  tags text[] not null default '{}',
  published boolean not null default false,
  published_at timestamptz,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Blog comments table
create table if not exists public.blog_comments (
  id bigserial primary key,
  post_id bigint not null references public.blog_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- Enable RLS for blog tables
alter table public.blog_posts enable row level security;
alter table public.blog_comments enable row level security;

-- Blog posts RLS policies
drop policy if exists blog_posts_select_published on public.blog_posts;
create policy blog_posts_select_published
on public.blog_posts
for select
using (published = true);

drop policy if exists blog_posts_select_own_draft on public.blog_posts;
create policy blog_posts_select_own_draft
on public.blog_posts
for select
using (
  auth.uid() = author_id
  or public.is_admin()
);

drop policy if exists blog_posts_insert_admin on public.blog_posts;
create policy blog_posts_insert_admin
on public.blog_posts
for insert
with check (public.is_admin());

drop policy if exists blog_posts_update_admin on public.blog_posts;
create policy blog_posts_update_admin
on public.blog_posts
for update
using (
  auth.uid() = author_id
  or public.is_admin()
);

drop policy if exists blog_posts_delete_admin on public.blog_posts;
create policy blog_posts_delete_admin
on public.blog_posts
for delete
using (public.is_admin());

-- Blog comments RLS policies
drop policy if exists blog_comments_select on public.blog_comments;
create policy blog_comments_select
on public.blog_comments
for select
using (approved = true or auth.uid() = author_id);

drop policy if exists blog_comments_insert on public.blog_comments;
create policy blog_comments_insert
on public.blog_comments
for insert
with check (auth.uid() = author_id);

drop policy if exists blog_comments_delete_own on public.blog_comments;
create policy blog_comments_delete_own
on public.blog_comments
for delete
using (auth.uid() = author_id);

drop policy if exists blog_comments_delete_admin on public.blog_comments;
create policy blog_comments_delete_admin
on public.blog_comments
for delete
using (public.is_admin());

-- Helpful indexes for session-based chat lookup and foreign keys
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_chat_history_session_id on public.chat_history(session_id);
create index if not exists idx_chat_history_user_id on public.chat_history(user_id);
create index if not exists idx_bookings_user_id on public.bookings(user_id);
create index if not exists idx_admin_notifications_booking_id on public.admin_notifications(booking_id);
create index if not exists idx_itineraries_user_id on public.itineraries(user_id);
create index if not exists idx_itineraries_share_token on public.itineraries(share_token);
create index if not exists idx_blog_posts_slug on public.blog_posts(slug);
create index if not exists idx_blog_posts_author_id on public.blog_posts(author_id);
create index if not exists idx_blog_posts_published on public.blog_posts(published);
create index if not exists idx_blog_comments_post_id on public.blog_comments(post_id);
create index if not exists idx_blog_comments_author_id on public.blog_comments(author_id);

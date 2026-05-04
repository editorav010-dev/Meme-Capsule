create extension if not exists pgcrypto;

create table if not exists public.memes (
  id text primary key default ('meme-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  title text not null default 'Untitled meme',
  image_url text,
  storage_path text,
  source_link text,
  category text not null default 'Unsorted',
  tags text[] not null default '{}',
  rarity text not null default 'Common' check (rarity in ('Common', 'Rare', 'Legendary')),
  status text not null default 'draft' check (status in ('active', 'draft', 'archived')),
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  input_method text not null default 'url' check (input_method in ('url', 'upload', 'google-drive', 'seed')),
  is_active boolean not null default false,
  uploaded_at timestamptz not null default now(),
  shown_count integer not null default 0,
  share_count integer not null default 0,
  rights_note text not null default 'reviewed',
  share_text text not null default 'Spawned from Meme Capsule',
  random_key double precision not null default random(),
  constraint meme_image_source check (image_url is not null or storage_path is not null)
);

create index if not exists memes_active_random_key_idx
  on public.memes (is_active, random_key);

create index if not exists memes_status_idx
  on public.memes (status);

create index if not exists memes_uploaded_at_idx
  on public.memes (uploaded_at desc);

alter table public.memes enable row level security;

drop policy if exists "Public can read active memes" on public.memes;
create policy "Public can read active memes"
  on public.memes
  for select
  using (is_active = true and status = 'active');

-- Create a public bucket named "memes" in Supabase Storage.
insert into storage.buckets (id, name, public)
values ('memes', 'memes', true)
on conflict (id) do update set public = excluded.public;

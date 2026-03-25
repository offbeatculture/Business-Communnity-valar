-- Prompt Library table
create table if not exists prompt_library (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  prompt_text text not null,
  category text not null,
  linked_content_id uuid,
  linked_content_type text check (linked_content_type in ('resource', 'video_summary')),
  is_published boolean not null default true,
  copy_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for filtering
create index idx_prompt_library_category on prompt_library (category);
create index idx_prompt_library_linked on prompt_library (linked_content_id) where linked_content_id is not null;

-- RLS
alter table prompt_library enable row level security;

-- Authenticated users can read published prompts
create policy "Authenticated users can read published prompts"
  on prompt_library for select
  to authenticated
  using (is_published = true);

-- Updated_at trigger
create or replace function update_prompt_library_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger prompt_library_updated_at
  before update on prompt_library
  for each row
  execute function update_prompt_library_updated_at();

-- RPC to atomically increment copy_count
create or replace function increment_prompt_copy_count(prompt_id uuid)
returns void as $$
begin
  update prompt_library set copy_count = copy_count + 1 where id = prompt_id;
end;
$$ language plpgsql security definer;

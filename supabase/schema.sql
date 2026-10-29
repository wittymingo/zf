-- 追分台球 · Supabase 建表脚本
-- 用法：Supabase Dashboard → SQL Editor → 粘贴整段执行（可重复执行）

create table if not exists public.matches (
  id uuid primary key,
  created_at timestamptz not null default now(),
  -- 三人追分结算模式：all = 通赔（另外两家都赔），upper = 只赔上家
  three_mode text not null default 'all'
);

alter table public.matches add column if not exists three_mode text not null default 'all';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'matches_three_mode_check') then
    alter table public.matches
      add constraint matches_three_mode_check check (three_mode in ('all', 'upper'));
  end if;
end $$;

create table if not exists public.match_players (
  id uuid primary key,
  match_id uuid not null references public.matches(id) on delete cascade,
  seat int not null,
  name text not null default '',
  unique (match_id, seat)
);

create table if not exists public.match_actions (
  id uuid primary key,
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.match_players(id) on delete cascade,
  type_id text not null,
  delta int not null,
  -- 三人追分一次操作会连带其他玩家，记录每位实际加减分
  transfers jsonb,
  created_at timestamptz not null default now()
);

alter table public.match_actions add column if not exists transfers jsonb;

create index if not exists match_players_match_idx on public.match_players (match_id, seat);
create index if not exists match_actions_match_time_idx on public.match_actions (match_id, created_at, id);

-- 分享链接即权限：拿到 match uuid 的人可以读写这一局。
-- 没有用户体系，所以直接放行 anon 角色；uuid 不可枚举，适合朋友局。
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.match_actions enable row level security;

drop policy if exists matches_link_access on public.matches;
create policy matches_link_access on public.matches
  for all to anon, authenticated using (true) with check (true);

drop policy if exists match_players_link_access on public.match_players;
create policy match_players_link_access on public.match_players
  for all to anon, authenticated using (true) with check (true);

drop policy if exists match_actions_link_access on public.match_actions;
create policy match_actions_link_access on public.match_actions
  for all to anon, authenticated using (true) with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete
  on public.matches, public.match_players, public.match_actions
  to anon, authenticated;

-- Realtime 需要看到 DELETE 前的完整旧行，否则按 match_id 过滤删除事件会失效
alter table public.match_actions replica identity full;
alter table public.match_players replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      execute 'alter publication supabase_realtime add table public.match_actions';
    exception when duplicate_object then null;
    end;
    begin
      execute 'alter publication supabase_realtime add table public.match_players';
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- 比分视图：按 transfers 结算，未记录 transfers 的旧数据回退到单人加减
create or replace view public.match_scores
with (security_invoker = true) as
select
  p.match_id,
  p.id as player_id,
  p.seat,
  p.name,
  coalesce(sum(
    case
      when a.transfers is null then
        case when a.player_id = p.id then a.delta else 0 end
      else coalesce((
        select (t.value->>'delta')::int
        from jsonb_array_elements(a.transfers) as t
        where (t.value->>'playerId') = p.id::text
      ), 0)
    end
  ), 0)::int as score
from public.match_players p
left join public.match_actions a on a.match_id = p.match_id
group by p.match_id, p.id, p.seat, p.name;

grant select on public.match_scores to anon, authenticated;

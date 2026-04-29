alter table public.coach_highlight_metadata
  add column if not exists order_index integer not null default 0;

with ranked as (
  select id,
         row_number() over (partition by coach_id order by created_at) - 1 as rn
  from public.coach_highlight_metadata
)
update public.coach_highlight_metadata m
set order_index = r.rn
from ranked r
where r.id = m.id;

create index if not exists idx_chm_coach_order
  on public.coach_highlight_metadata (coach_id, order_index);
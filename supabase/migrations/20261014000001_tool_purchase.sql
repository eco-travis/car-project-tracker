-- Tools: was it bought for this project? (Travis, 2026-10-14). Tools that already have a
-- tool expense were bought, so they start as true.
alter table tools add column bought_for_project boolean not null default false;

update tools t
   set bought_for_project = true
 where exists (
   select 1 from expenses e
    where e.tool_id = t.id and e.category = 'tool' and e.amount_cents > 0
 );

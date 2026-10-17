-- Parts: the expense that records what the part cost (Travis, 2026-10-16). Add part requires a
-- cost once the part is bought, and Edit part changes that expense's amount. Backfilled with each
-- part's earliest positive part expense.
alter table parts
  add column purchase_expense_id uuid references expenses on delete set null;

update parts p
   set purchase_expense_id = (
     select e.id from expenses e
      where e.part_id = p.id and e.category = 'part' and e.amount_cents > 0
      order by e.spent_on, e.created_at
      limit 1
   );

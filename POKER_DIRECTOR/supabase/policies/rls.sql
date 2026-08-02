-- Example RLS policies for POKER DIRECTOR
-- Adjust to your auth.users mapping before production use.

alter table venues enable row level security;
alter table venue_members enable row level security;
alter table tournaments enable row level security;
alter table players enable row level security;
alter table tournament_entries enable row level security;
alter table tables enable row level security;
alter table timer_states enable row level security;
alter table announcements enable row level security;
alter table audit_logs enable row level security;
alter table app_snapshots enable row level security;

-- Staff/admin of a venue can read venue data
create policy "venue members can read venues"
  on venues for select
  using (
    exists (
      select 1 from venue_members vm
      where vm.venue_id = venues.id
        and vm.user_id = auth.uid()
        and vm.deleted_at is null
    )
  );

create policy "admins can manage venues"
  on venues for all
  using (
    exists (
      select 1 from venue_members vm
      where vm.venue_id = venues.id
        and vm.user_id = auth.uid()
        and vm.role = 'admin'
        and vm.deleted_at is null
    )
  );

create policy "members read tournaments"
  on tournaments for select
  using (
    exists (
      select 1 from venue_members vm
      where vm.venue_id = tournaments.venue_id
        and vm.user_id = auth.uid()
    )
  );

create policy "directors manage tournaments"
  on tournaments for all
  using (
    exists (
      select 1 from venue_members vm
      where vm.venue_id = tournaments.venue_id
        and vm.user_id = auth.uid()
        and vm.role in ('admin','director')
    )
  );

-- Public player access by access code should be implemented via a secure RPC,
-- not by opening tournament_entries broadly.
-- Example: create function get_player_view(code text) ... security definer;

create policy "members read timer"
  on timer_states for select
  using (true);

create policy "directors update timer"
  on timer_states for update
  using (
    exists (
      select 1
      from tournaments t
      join venue_members vm on vm.venue_id = t.venue_id
      where t.id = timer_states.tournament_id
        and vm.user_id = auth.uid()
        and vm.role in ('admin','director')
    )
  );

-- Phone numbers: only admin role should select player.phone in API views.
-- Prefer column-level privileges or view wrappers in production.

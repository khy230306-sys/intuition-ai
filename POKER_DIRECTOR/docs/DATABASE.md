# Database

로컬과 클라우드가 동일한 도메인 모델을 사용합니다.

## 주요 엔티티

users, venues, venue_members, tournaments, blind_structures, blind_levels, players, tournament_entries, tables, seats, table_movements, eliminations, rebuys, reentries, addons, bounties, prize_structures, payouts, announcements, staff_requests, timer_states, audit_logs, app_settings

공통 필드: `id`, `created_at`, `updated_at`, `created_by`, `deleted_at` (가능 시 `venue_id` / `tournament_id`)

## 파일

- SQL: `supabase/migrations/001_init.sql`
- RLS 예시: `supabase/policies/rls.sql`

## 로컬 저장

- IndexedDB DB: `poker-director`
- localStorage 키: `poker-director-snapshot-v1`

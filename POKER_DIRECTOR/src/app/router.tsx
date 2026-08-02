import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { TimerPage } from '@/features/timer/TimerPage'
import { PlayersPage } from '@/features/players/PlayersPage'
import { TablesPage } from '@/features/tables/TablesPage'
import { MorePage } from '@/features/settings/MorePage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { CreateTournamentPage } from '@/features/tournaments/CreateTournamentPage'
import { BlindEditorPage } from '@/features/tournaments/BlindEditorPage'
import { TournamentDetailPage } from '@/features/tournaments/TournamentDetailPage'
import { TvDisplayPage } from '@/features/display/TvDisplayPage'
import { PlayerViewPage } from '@/features/display/PlayerViewPage'
import { PayoutsPage } from '@/features/payouts/PayoutsPage'
import { AnnouncementsPage } from '@/features/announcements/AnnouncementsPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { StaffPage } from '@/features/staff/StaffPage'
import { useAppStore } from '@/stores/appStore'

function RequireAuth() {
  const session = useAppStore((s) => s.session)
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/display/tournament/:id" element={<TvDisplayPage />} />
      <Route path="/player/:accessCode" element={<PlayerViewPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="timer" element={<TimerPage />} />
          <Route path="players" element={<PlayersPage />} />
          <Route path="tables" element={<TablesPage />} />
          <Route path="more" element={<MorePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="tournaments/new" element={<CreateTournamentPage />} />
          <Route path="tournaments/:id" element={<TournamentDetailPage />} />
          <Route path="tournaments/:id/blinds" element={<BlindEditorPage />} />
          <Route path="payouts" element={<PayoutsPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="staff" element={<StaffPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

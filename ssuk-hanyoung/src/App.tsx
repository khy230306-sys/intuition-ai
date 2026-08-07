import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Games } from './pages/Games'
import { Explore } from './pages/Explore'
import { GamePlay } from './pages/GamePlay'
import { Parents } from './pages/Parents'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="games" element={<Games />} />
        <Route path="games/:id" element={<GamePlay />} />
        <Route path="explore" element={<Explore />} />
        <Route path="explore/:topic" element={<Explore />} />
        <Route path="parents" element={<Parents />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

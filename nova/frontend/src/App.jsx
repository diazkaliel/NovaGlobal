import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import RepairsPage from './pages/RepairsPage'
import NewRepairPage from './pages/NewRepairPage'
import RepairDetailPage from './pages/RepairDetailPage'
import InventoryPage from './pages/InventoryPage'
import ScreenPricesPage from './pages/ScreenPricesPage'
import ClientsPage from './pages/ClientsPage'
import ClientDetailPage from './pages/ClientDetailPage'
import StatsPage from './pages/StatsPage'
import FullCalendarPage from './pages/FullCalendarPage'
import DiagnosticAssistantPage from './pages/DiagnosticAssistantPage'
import NovaLayout from './components/NovaLayout'

// Bravo Pages
import SystemSelectorPage from './pages/SystemSelectorPage'
import BravoDashboardPage from './pages/bravo/BravoDashboardPage'
import BravoProductsPage from './pages/bravo/BravoProductsPage'
import BravoNewProductPage from './pages/bravo/BravoNewProductPage'
import BravoNewOrderPage from './pages/bravo/BravoNewOrderPage'
import BravoOrdersPage from './pages/bravo/BravoOrdersPage'
import BravoOrderDetailPage from './pages/bravo/BravoOrderDetailPage'
import BravoClientsPage from './pages/bravo/BravoClientsPage'
import BravoClientDetailPage from './pages/bravo/BravoClientDetailPage'
import BravoStatsPage from './pages/bravo/BravoStatsPage'

import BravoLayout from './components/bravo/BravoLayout'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-cyan-400 text-xl animate-pulse">Cargando...</div>
    </div>
  )
  return user ? children : <Navigate to="/login" />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/" /> : children
}

function DashboardDispatcher() {
  const selectedSystem = localStorage.getItem('selected_system')
  if (!selectedSystem) {
    return <Navigate to="/select-system" replace />
  }
  return selectedSystem === 'bravo' ? <Navigate to="/bravo" replace /> : <DashboardPage />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

          {/* Selector & Dispatched Root */}
          <Route path="/select-system" element={<PrivateRoute><SystemSelectorPage /></PrivateRoute>} />

          {/* Nova System Routes */}
          <Route element={<PrivateRoute><NovaLayout /></PrivateRoute>}>
            <Route path="/" element={<DashboardDispatcher />} />
            <Route path="/repairs" element={<RepairsPage />} />
            <Route path="/repairs/new" element={<NewRepairPage />} />
            <Route path="/repairs/:id" element={<RepairDetailPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/screen-prices" element={<ScreenPricesPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/clients/:id" element={<ClientDetailPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/calendar" element={<FullCalendarPage />} />
            <Route path="/diagnostics" element={<DiagnosticAssistantPage />} />
          </Route>

          {/* Bravo System Routes */}
          <Route element={<PrivateRoute><BravoLayout /></PrivateRoute>}>
            <Route path="/bravo" element={<BravoDashboardPage />} />
            <Route path="/bravo/orders" element={<BravoOrdersPage />} />
            <Route path="/bravo/orders/new" element={<BravoNewOrderPage />} />
            <Route path="/bravo/orders/:id" element={<BravoOrderDetailPage />} />
            <Route path="/bravo/products" element={<BravoProductsPage />} />
            <Route path="/bravo/products/new" element={<BravoNewProductPage />} />
            <Route path="/bravo/clients" element={<BravoClientsPage />} />
            <Route path="/bravo/clients/:id" element={<BravoClientDetailPage />} />
            <Route path="/bravo/stats" element={<BravoStatsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
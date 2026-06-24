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

// Bravo Pages
import SystemSelectorPage from './pages/SystemSelectorPage'
import BravoDashboardPage from './pages/bravo/BravoDashboardPage'
import BravoProductsPage from './pages/bravo/BravoProductsPage'
import BravoNewProductPage from './pages/bravo/BravoNewProductPage'
import BravoNewOrderPage from './pages/bravo/BravoNewOrderPage'

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
          <Route path="/" element={<PrivateRoute><DashboardDispatcher /></PrivateRoute>} />
          <Route path="/select-system" element={<PrivateRoute><SystemSelectorPage /></PrivateRoute>} />

          {/* Nova System Routes */}
          <Route path="/repairs" element={<PrivateRoute><RepairsPage /></PrivateRoute>} />
          <Route path="/repairs/new" element={<PrivateRoute><NewRepairPage /></PrivateRoute>} />
          <Route path="/repairs/:id" element={<PrivateRoute><RepairDetailPage /></PrivateRoute>} />
          <Route path="/inventory" element={<PrivateRoute><InventoryPage /></PrivateRoute>} />
          <Route path="/screen-prices" element={<PrivateRoute><ScreenPricesPage /></PrivateRoute>} />
          <Route path="/clients" element={<PrivateRoute><ClientsPage /></PrivateRoute>} />
          <Route path="/clients/:id" element={<PrivateRoute><ClientDetailPage /></PrivateRoute>} />
          <Route path="/stats" element={<PrivateRoute><StatsPage /></PrivateRoute>} />
          <Route path="/calendar" element={<PrivateRoute><FullCalendarPage /></PrivateRoute>} />
          <Route path="/diagnostics" element={<PrivateRoute><DiagnosticAssistantPage /></PrivateRoute>} />

          {/* Bravo System Routes */}
          <Route path="/bravo" element={<PrivateRoute><BravoDashboardPage /></PrivateRoute>} />
          <Route path="/bravo/products" element={<PrivateRoute><BravoProductsPage /></PrivateRoute>} />
          <Route path="/bravo/products/new" element={<PrivateRoute><BravoNewProductPage /></PrivateRoute>} />
          <Route path="/bravo/orders/new" element={<PrivateRoute><BravoNewOrderPage /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
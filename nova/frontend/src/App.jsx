import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { isLocalHost } from './utils/system'
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
import SalesPage from './pages/SalesPage'
import CashRegisterPage from './pages/CashRegisterPage'
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
import BravoAdminWebPage from './pages/bravo/BravoAdminWebPage'
import BravoSalesPage from './pages/bravo/BravoSalesPage'
import BravoCashRegisterPage from './pages/bravo/BravoCashRegisterPage'
import MachinesPage from './pages/bravo/MachinesPage'
import BravoChatsPage from './pages/bravo/BravoChatsPage'

import BravoLayout from './components/bravo/BravoLayout'

// Public Subdomain Pages
import NovaPublicPage from './pages/public/NovaPublicPage'
import BravoPublicPage from './pages/public/BravoPublicPage'
import LandingPortalPage from './pages/LandingPortalPage'
import AdminWebPage from './pages/AdminWebPage'
import BravoProofingPage from './pages/public/BravoProofingPage'

const getActiveSystem = () => {
  const host = window.location.hostname.toLowerCase()
  const devOverride = localStorage.getItem('dev_override')
  if (devOverride) return devOverride
  return host.includes('bravo') ? 'bravo' : 'nova'
}

function PrivateRoute({ children, allowedSystem }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-cyan-400 text-xl animate-pulse">Cargando...</div>
    </div>
  )
  if (!user) return <Navigate to="/login" />

  const activeSystem = getActiveSystem()

  // Enforce strict subdomain separation: redirect to the system matches current hostname
  if (allowedSystem && activeSystem !== allowedSystem) {
    return <Navigate to={activeSystem === 'bravo' ? "/bravo" : "/dashboard"} replace />
  }

  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) {
    const activeSystem = getActiveSystem()
    return <Navigate to={activeSystem === 'bravo' ? "/bravo" : "/dashboard"} replace />
  }
  return children
}

function DashboardDispatcher() {
  const activeSystem = getActiveSystem()
  return activeSystem === 'bravo' ? <Navigate to="/bravo" replace /> : <Navigate to="/dashboard" replace />
}

function RootDispatcher() {
  const { user, loading } = useAuth()
  const [devOverride, setDevOverride] = useState(() => localStorage.getItem('dev_override'))

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-cyan-400 text-xl animate-pulse">Cargando...</div>
    </div>
  )

  if (user) {
    return <DashboardDispatcher />
  }

  // Detect current active public view (respecting devOverride)
  const host = window.location.hostname.toLowerCase()

  // If the subdomain is admin, redirect to login directly
  const isAdminSubdomain = host.startsWith('admin.') || (host.includes('admin') && !host.includes('localhost') && !host.includes('127.0.0.1'))
  if (isAdminSubdomain && !devOverride) {
    return <Navigate to="/login" replace />
  }

  // Developer toggle switcher component
  const isDev = isLocalHost(host)

  if (!devOverride && isDev) {
    return <LandingPortalPage />
  }

  const activeSystem = devOverride || (host.includes('bravo') ? 'bravo' : 'nova')
  const isBravo = activeSystem === 'bravo'

  const handleSetDevOverride = (val) => {
    localStorage.setItem('dev_override', val)
    setDevOverride(val)
    window.location.reload()
  }

  const devToggle = isDev ? (
    <div className="fixed bottom-4 left-4 z-50 bg-gray-900/90 border border-gray-700/60 text-xs px-3 py-2 rounded-xl shadow-lg flex items-center gap-2 font-mono text-white pointer-events-auto">
      <span className="text-gray-400">DEV SWITCH:</span>
      <button 
        onClick={() => handleSetDevOverride('nova')} 
        className={`px-2 py-1 rounded cursor-pointer transition-colors ${!isBravo ? 'bg-cyan-500 text-gray-950 font-bold' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
      >
        NOVA
      </button>
      <button 
        onClick={() => handleSetDevOverride('bravo')} 
        className={`px-2 py-1 rounded cursor-pointer transition-colors ${isBravo ? 'bg-amber-500 text-gray-950 font-bold' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
      >
        BRAVO
      </button>
      <span className="text-gray-600">|</span>
      <button 
        onClick={() => {
          localStorage.removeItem('dev_override')
          window.location.reload()
        }}
        className="px-2 py-1 rounded bg-rose-650 hover:bg-rose-700 text-white font-bold cursor-pointer transition-colors"
      >
        PORTAL
      </button>
    </div>
  ) : null

  return isBravo ? (
    <BravoPublicPage devToggle={devToggle} />
  ) : (
    <NovaPublicPage devToggle={devToggle} />
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Subdomain Routes */}
          <Route path="/" element={<RootDispatcher />} />
          
          {/* Public Proofing Portal */}
          <Route path="/bravo/proof/:orderNumber" element={<BravoProofingPage />} />
          
          {/* Public Portal Selector Route */}
          <Route path="/portal" element={<LandingPortalPage />} />

          {/* Public Authentication Routes */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

          {/* Selector & Dispatched Root */}
          <Route path="/select-system" element={<PrivateRoute><DashboardDispatcher /></PrivateRoute>} />

          {/* Nova System Routes */}
          <Route element={<PrivateRoute allowedSystem="nova"><NovaLayout /></PrivateRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
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
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/cash-register" element={<CashRegisterPage />} />
            <Route path="/admin-web" element={<AdminWebPage />} />
          </Route>

          {/* Bravo System Routes */}
          <Route element={<PrivateRoute allowedSystem="bravo"><BravoLayout /></PrivateRoute>}>
            <Route path="/bravo" element={<BravoDashboardPage />} />
            <Route path="/bravo/orders" element={<BravoOrdersPage />} />
            <Route path="/bravo/orders/new" element={<BravoNewOrderPage />} />
            <Route path="/bravo/orders/:id" element={<BravoOrderDetailPage />} />
            <Route path="/bravo/products" element={<BravoProductsPage />} />
            <Route path="/bravo/products/new" element={<BravoNewProductPage />} />
            <Route path="/bravo/clients" element={<BravoClientsPage />} />
            <Route path="/bravo/clients/:id" element={<BravoClientDetailPage />} />
            <Route path="/bravo/stats" element={<BravoStatsPage />} />
            <Route path="/bravo/sales" element={<BravoSalesPage />} />
            <Route path="/bravo/cash-register" element={<BravoCashRegisterPage />} />
            <Route path="/bravo/machines" element={<MachinesPage />} />
            <Route path="/bravo/admin-web" element={<BravoAdminWebPage />} />
            <Route path="/bravo/chats" element={<BravoChatsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
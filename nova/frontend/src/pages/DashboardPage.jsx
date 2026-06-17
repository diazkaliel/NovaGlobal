import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'
import { Wrench, Users, Package, LogOut, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AnimatedBackground from '../components/AnimatedBackground'
import { useGlitch } from '../hooks/useGlitch'
import DeliveryCalendar from '../components/DeliveryCalendar'

const modules = [
  {
    title: 'Reparaciones',
    description: 'Gestión de órdenes, diagnósticos y estado de equipos en taller.',
    icon: Wrench,
    path: '/repairs',
    accent: '#06b6d4',
    accentBg: 'rgba(6,182,212,.10)',
    accentBorder: 'rgba(6,182,212,.25)',
    accentHover: 'rgba(6,182,212,.18)',
  },
  {
    title: 'Clientes',
    description: 'Directorio, historial de servicios y comunicación automatizada.',
    icon: Users,
    path: '/clients',
    accent: '#a855f7',
    accentBg: 'rgba(168,85,247,.10)',
    accentBorder: 'rgba(168,85,247,.25)',
    accentHover: 'rgba(168,85,247,.18)',
  },
  {
    title: 'Inventario',
    description: 'Control de stock, piezas de repuesto y alertas de reabastecimiento.',
    icon: Package,
    path: '/inventory',
    accent: '#34d399',
    accentBg: 'rgba(52,211,153,.10)',
    accentBorder: 'rgba(52,211,153,.25)',
    accentHover: 'rgba(52,211,153,.18)',
  },
]

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const glitchTitle = useGlitch('NOVA', true)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      <style>{`
        /* ── Shell ──────────────────────────────────────────────────────────── */
        .dash-page {
          min-height: 100vh;
          background: #050508;
          color: #f1f5f9;
          font-family: 'Inter', system-ui, sans-serif;
          position: relative;
          overflow: hidden;
        }

        .blob {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(90px);
        }
        .blob-a { top: 0;    left: 33%;  width: 480px; height: 480px; background: rgba(6,182,212,.04); }
        .blob-b { bottom: 0; right: 33%; width: 480px; height: 480px; background: rgba(168,85,247,.04); }

        /* ── Navbar ─────────────────────────────────────────────────────────── */
        .dash-nav {
          position: relative;
          z-index: 10;
          border-bottom: 1px solid rgba(255,255,255,.07);
          background: rgba(9,9,18,.55);
          backdrop-filter: blur(16px);
          padding: 14px 24px;
        }
        .nav-inner {
          max-width: 960px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .nav-logo {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: .3em;
          background: linear-gradient(135deg, #06b6d4, #a855f7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .nav-right { display: flex; align-items: center; gap: 20px; }
        .nav-user  { display: flex; align-items: center; gap: 7px; }
        .user-dot  {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #34d399;
          animation: blink 2s ease-in-out infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.35} }
        .user-name { font-size: 13px; color: #64748b; }

        .btn-logout {
          display: flex; align-items: center; gap: 6px;
          font-size: 13px;
          color: #475569;
          background: none;
          border: none;
          cursor: pointer;
          transition: color .15s;
          padding: 0;
        }
        .btn-logout:hover { color: #f87171; }

        /* ── Main ───────────────────────────────────────────────────────────── */
        .dash-main {
          position: relative;
          z-index: 10;
          max-width: 960px;
          margin: 0 auto;
          padding: 56px 24px 64px;
        }

        /* ── Hero header ────────────────────────────────────────────────────── */
        .dash-header { margin-bottom: 52px; }
        .dash-eyebrow {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: #334155;
          margin-bottom: 10px;
        }
        .dash-greeting {
          font-size: 36px;
          font-weight: 700;
          letter-spacing: -.02em;
          line-height: 1.1;
          color: #e2e8f0;
        }
        .dash-greeting-name {
          background: linear-gradient(135deg, #06b6d4, #a855f7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .dash-rule {
          height: 1px;
          width: 56px;
          background: linear-gradient(90deg, #06b6d4, #a855f7);
          margin-top: 20px;
          border: none;
        }

        /* ── Module cards ───────────────────────────────────────────────────── */
        .modules-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 40px;
        }

        .module-card {
          position: relative;
          text-align: left;
          padding: 22px 20px 20px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.025);
          cursor: pointer;
          transition: border-color .2s, background .2s, transform .18s;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .module-card:hover {
          transform: translateY(-4px);
          background: var(--card-hover-bg);
          border-color: var(--card-border);
        }

        /* Top accent line on hover */
        .module-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: var(--card-accent);
          opacity: 0;
          transition: opacity .2s;
        }
        .module-card:hover::before { opacity: 1; }

        .card-icon-wrap {
          width: 40px; height: 40px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          background: var(--card-icon-bg);
          border: 1px solid var(--card-border);
          margin-bottom: 16px;
          transition: transform .2s;
        }
        .module-card:hover .card-icon-wrap { transform: scale(1.08); }

        .card-title {
          font-size: 15px;
          font-weight: 600;
          color: #e2e8f0;
          margin-bottom: 6px;
        }
        .card-desc {
          font-size: 12px;
          color: #475569;
          line-height: 1.6;
          flex: 1;
        }
        .card-cta {
          display: flex;
          align-items: center;
          gap: 3px;
          margin-top: 16px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: var(--card-accent);
          opacity: 0;
          transform: translateX(-4px);
          transition: opacity .2s, transform .2s;
        }
        .module-card:hover .card-cta { opacity: 1; transform: translateX(0); }

        /* ── Calendar section ───────────────────────────────────────────────── */
        .section-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: .10em;
          text-transform: uppercase;
          color: #334155;
          margin-bottom: 14px;
        }
        .calendar-wrap {
          background: rgba(255,255,255,.02);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 14px;
          overflow: hidden;
        }

        /* ── Responsive ─────────────────────────────────────────────────────── */
        @media (max-width: 680px) {
          .modules-grid { grid-template-columns: 1fr; }
          .dash-greeting { font-size: 26px; }
        }
        @media (max-width: 900px) and (min-width: 681px) {
          .modules-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      <div className="dash-page">
        <AnimatedBackground />
        <div className="blob blob-a" />
        <div className="blob blob-b" />

        {/* Navbar */}
        <nav className="dash-nav">
          <div className="nav-inner">
            <motion.span
              className="nav-logo"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
            >
              {glitchTitle}
            </motion.span>

            <div className="nav-right">
              <motion.div
                className="nav-user"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <span className="user-dot" />
                <span className="user-name">{user?.name}</span>
              </motion.div>

              <motion.button
                className="btn-logout"
                onClick={handleLogout}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                <LogOut size={14} />
                Salir
              </motion.button>
            </div>
          </div>
        </nav>

        {/* Main */}
        <main className="dash-main">

          {/* Hero header */}
          <motion.div
            className="dash-header"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="dash-eyebrow">Panel de control · Nova Tecnologies</p>
            <h2 className="dash-greeting">
              Bienvenido,{' '}
              <span className="dash-greeting-name">{user?.name}</span>
            </h2>
            <motion.hr
              className="dash-rule"
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.35, duration: 0.7 }}
            />
          </motion.div>

          {/* Module cards */}
          <div className="modules-grid">
            {modules.map((mod, i) => (
              <motion.button
                key={mod.title}
                className="module-card"
                style={{
                  '--card-accent':   mod.accent,
                  '--card-border':   mod.accentBorder,
                  '--card-icon-bg':  mod.accentBg,
                  '--card-hover-bg': mod.accentHover,
                }}
                onClick={() => navigate(mod.path)}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.09, duration: 0.45 }}
              >
                <div className="card-icon-wrap">
                  <mod.icon size={18} style={{ color: mod.accent }} />
                </div>
                <div className="card-title">{mod.title}</div>
                <div className="card-desc">{mod.description}</div>
                <div className="card-cta">
                  Acceder <ChevronRight size={12} />
                </div>
              </motion.button>
            ))}
          </div>

          {/* Delivery calendar */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <p className="section-label">Calendario de entregas</p>
            <div className="calendar-wrap">
              <DeliveryCalendar />
            </div>
          </motion.div>

        </main>
      </div>
    </>
  )
}
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'
import {
  Wrench, Users, Package, LogOut, ChevronRight, Smartphone,
  RefreshCw, BarChart3, Calendar, ClipboardList,
  Activity, AlertTriangle, CheckCircle2, Zap,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AnimatedBackground from '../components/AnimatedBackground'
import { useGlitch } from '../hooks/useGlitch'
import DeliveryCalendar from '../components/DeliveryCalendar'
import { getRepairs } from '../api/repairs'

/* ─── Animated counter mini-component ─── */
function AnimatedCounter({ target, duration = 1200 }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (target === 0) { setCount(0); return }
    let start = null
    let raf
    const step = (timestamp) => {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      setCount(Math.floor(progress * target))
      if (progress < 1) {
        raf = requestAnimationFrame(step)
      } else {
        setCount(target)
      }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return <span>{count}</span>
}

/* ─── Module definitions ─── */
const modules = [
  {
    title: 'Reparaciones',
    description: 'Gestión de órdenes, diagnósticos y estado de equipos en taller.',
    icon: Wrench,
    path: '/repairs',
    accent: 'var(--color-cyan-400)',
    accentBg: 'rgba(0, 242, 254, .08)',
    accentBorder: 'rgba(0, 242, 254, .20)',
    accentHover: 'rgba(0, 242, 254, .14)',
    accentGlow: 'rgba(0, 242, 254, .12)',
  },
  {
    title: 'Clientes',
    description: 'Directorio, historial de servicios y comunicación automatizada.',
    icon: Users,
    path: '/clients',
    accent: 'var(--color-purple-400)',
    accentBg: 'rgba(168, 85, 247, .08)',
    accentBorder: 'rgba(168, 85, 247, .20)',
    accentHover: 'rgba(168, 85, 247, .14)',
    accentGlow: 'rgba(168, 85, 247, .12)',
  },
  {
    title: 'Inventario',
    description: 'Control de stock, piezas de repuesto y alertas de reabastecimiento.',
    icon: Package,
    path: '/inventory',
    accent: 'var(--color-emerald-450)',
    accentBg: 'rgba(6, 214, 160, .08)',
    accentBorder: 'rgba(6, 214, 160, .20)',
    accentHover: 'rgba(6, 214, 160, .14)',
    accentGlow: 'rgba(6, 214, 160, .12)',
  },
  {
    title: 'Valores de Pantallas',
    description: 'Consulta rápida de precios de pantallas al cliente, costos y ganancias de marcas conocidas.',
    icon: Smartphone,
    path: '/screen-prices',
    accent: 'var(--color-rose-455)',
    accentBg: 'rgba(255, 0, 110, .08)',
    accentBorder: 'rgba(255, 0, 110, .20)',
    accentHover: 'rgba(255, 0, 110, .14)',
    accentGlow: 'rgba(255, 0, 110, .12)',
  },
  {
    title: 'Estadísticas Vitales',
    description: 'Métricas clave, rendimiento del taller y gráficos financieros interactivos.',
    icon: BarChart3,
    path: '/stats',
    accent: 'var(--color-blue-400)',
    accentBg: 'rgba(58, 134, 255, .08)',
    accentBorder: 'rgba(58, 134, 255, .20)',
    accentHover: 'rgba(58, 134, 255, .14)',
    accentGlow: 'rgba(58, 134, 255, .12)',
  },
  {
    title: 'Calendario Completo',
    description: 'Agenda de entregas y planificación de reparaciones en pantalla completa.',
    icon: Calendar,
    path: '/calendar',
    accent: 'var(--color-cyan-500)',
    accentBg: 'rgba(0, 210, 222, .08)',
    accentBorder: 'rgba(0, 210, 222, .20)',
    accentHover: 'rgba(0, 210, 222, .14)',
    accentGlow: 'rgba(0, 210, 222, .12)',
  },
  {
    title: 'Cotizador Rápido',
    description: 'Asistente interactivo de diagnóstico de fallas y presupuesto al mostrador.',
    icon: ClipboardList,
    path: '/diagnostics',
    accent: 'var(--color-yellow-450)',
    accentBg: 'rgba(255, 209, 102, .08)',
    accentBorder: 'rgba(255, 209, 102, .20)',
    accentHover: 'rgba(255, 209, 102, .14)',
    accentGlow: 'rgba(255, 209, 102, .12)',
  },
]

/* ─── Stat card definitions ─── */
const statCards = [
  { key: 'active',   label: 'Activas',       icon: Activity,       color: 'var(--color-cyan-400)', bg: 'rgba(0, 242, 254, .06)',   border: 'rgba(0, 242, 254, .15)'  },
  { key: 'ready',    label: 'Listas',         icon: CheckCircle2,   color: 'var(--color-emerald-450)', bg: 'rgba(6, 214, 160, .06)',  border: 'rgba(6, 214, 160, .15)' },
  { key: 'critical', label: 'Críticas',       icon: AlertTriangle,  color: 'var(--color-rose-455)', bg: 'rgba(255, 0, 110, .06)',   border: 'rgba(255, 0, 110, .15)'  },
  { key: 'today',    label: 'Entregas hoy',   icon: Zap,            color: 'var(--color-orange-450)', bg: 'rgba(247, 127, 0, .06)',  border: 'rgba(247, 127, 0, .15)' },
]

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const glitchTitle = useGlitch('NOVA', true)

  /* ─── Quick stats state ─── */
  const [stats, setStats] = useState({ active: 0, ready: 0, critical: 0, today: 0 })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getRepairs()
        const repairs = Array.isArray(res.data) ? res.data : []
        const todayStr = new Date().toISOString().split('T')[0]

        const active = repairs.filter(
          (r) => !['entregado', 'cancelado'].includes(r.status)
        ).length
        const ready = repairs.filter((r) => r.status === 'listo').length
        const critical = repairs.filter((r) => r.status === 'critico').length
        const today = repairs.filter((r) => {
          if (!r.estimated_delivery) return false
          return r.estimated_delivery.split('T')[0] === todayStr
        }).length

        setStats({ active, ready, critical, today })
      } catch {
        /* silently fail — stats just stay at 0 */
      }
    }
    fetchStats()
  }, [])

  /* ─── Formatted date ─── */
  const formattedDate = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSwitchSystem = () => {
    localStorage.removeItem('selected_system')
    navigate('/select-system')
  }

  return (
    <>
      <style>{`
        /* ─── Page shell ─── */
        .dash-page {
          min-height: 100vh;
          background: #050508;
          color: #f1f5f9;
          font-family: 'Inter', system-ui, sans-serif;
          position: relative;
          overflow: hidden;
        }

        /* ─── Ambient blobs ─── */
        .blob {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(90px);
        }
        .blob-a { top: 0;    left: 33%;  width: 480px; height: 480px; background: rgba(6,182,212,.04); }
        .blob-b { bottom: 0; right: 33%; width: 480px; height: 480px; background: rgba(168,85,247,.04); }

        /* ─── Navbar ─── */
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
          background: linear-gradient(135deg, var(--color-cyan-400), var(--color-purple-400));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .nav-right { display: flex; align-items: center; gap: 14px; }
        .nav-user  { display: flex; align-items: center; gap: 7px; }
        .user-dot  {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #34d399;
          animation: blink 2s ease-in-out infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.35} }
        .user-name { font-size: 13px; color: #94a3b8; font-weight: 500; }

        /* ─── Nav separator ─── */
        .nav-separator {
          width: 1px;
          height: 20px;
          background: rgba(255,255,255,.10);
          flex-shrink: 0;
        }

        /* ─── Pill buttons ─── */
        .btn-switch-system {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px;
          font-weight: 500;
          color: #7dd3fc;
          background: rgba(56,189,248,.08);
          border: 1px solid rgba(56,189,248,.25);
          border-radius: 20px;
          padding: 6px 14px;
          cursor: pointer;
          transition: background .2s, border-color .2s, color .2s;
        }
        .btn-switch-system:hover {
          background: rgba(56,189,248,.15);
          border-color: rgba(56,189,248,.4);
          color: #bae6fd;
        }
        .btn-logout {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px;
          font-weight: 500;
          color: #fca5a5;
          background: rgba(248,113,113,.06);
          border: 1px solid rgba(248,113,113,.2);
          border-radius: 20px;
          padding: 6px 14px;
          cursor: pointer;
          transition: background .2s, border-color .2s, color .2s;
        }
        .btn-logout:hover {
          background: rgba(248,113,113,.12);
          border-color: rgba(248,113,113,.35);
          color: #fecaca;
        }

        /* ─── Main content ─── */
        .dash-main {
          position: relative;
          z-index: 10;
          max-width: 960px;
          margin: 0 auto;
          padding: 56px 24px 64px;
        }

        /* ─── Header / Hero ─── */
        .dash-header { margin-bottom: 48px; }
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
          background: linear-gradient(135deg, var(--color-cyan-400), var(--color-purple-400));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .dash-date {
          font-size: 13px;
          color: #475569;
          margin-top: 8px;
          font-weight: 400;
        }
        .dash-rule {
          height: 2px;
          width: 56px;
          background: linear-gradient(90deg, var(--color-cyan-400), var(--color-purple-400));
          margin-top: 20px;
          border: none;
          animation: rulePulse 3s ease-in-out infinite;
        }
        @keyframes rulePulse {
          0%, 100% { width: 56px; }
          50% { width: 80px; }
        }

        /* ─── Quick stats row ─── */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 36px;
        }
        .stat-card {
          position: relative;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px 18px;
          border-radius: 14px;
          border: 1px solid var(--stat-border);
          background: var(--stat-bg);
          backdrop-filter: blur(12px);
          overflow: hidden;
        }
        .stat-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 14px;
          background: radial-gradient(ellipse at 20% 50%, var(--stat-bg), transparent 70%);
          pointer-events: none;
        }
        .stat-icon-wrap {
          position: relative;
          width: 42px; height: 42px;
          border-radius: 11px;
          display: flex; align-items: center; justify-content: center;
          background: var(--stat-bg);
          border: 1px solid var(--stat-border);
          flex-shrink: 0;
        }
        .stat-value {
          font-size: 26px;
          font-weight: 700;
          color: #e2e8f0;
          line-height: 1;
          letter-spacing: -.02em;
        }
        .stat-label {
          font-size: 11px;
          font-weight: 500;
          color: #64748b;
          margin-top: 2px;
          text-transform: uppercase;
          letter-spacing: .06em;
        }

        /* ─── Module grid ─── */
        .modules-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
          transition: border-color .2s, background .2s, transform .18s, box-shadow .25s;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .module-card:hover {
          transform: translateY(-4px);
          background: var(--card-hover-bg);
          border-color: var(--card-border);
          box-shadow: 0 0 20px var(--card-glow), 0 4px 16px rgba(0,0,0,.3);
        }
        .module-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--card-accent), transparent);
          opacity: 0;
          transition: opacity .25s;
        }
        .module-card:hover::before { opacity: 1; }
        .card-icon-wrap {
          width: 40px; height: 40px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          background: var(--card-icon-bg);
          border: 1px solid var(--card-border);
          margin-bottom: 16px;
          transition: transform .25s ease;
        }
        .module-card:hover .card-icon-wrap { transform: scale(1.08) rotate(6deg); }
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

        /* ─── Calendar section ─── */
        .section-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: .10em;
          text-transform: uppercase;
          color: #475569;
          margin-bottom: 14px;
        }
        .section-label-icon {
          color: #3b82f6;
          opacity: .7;
        }
        .calendar-wrap {
          position: relative;
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 16px;
          overflow: hidden;
          backdrop-filter: blur(12px);
        }
        .calendar-wrap::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 17px;
          padding: 1px;
          background: linear-gradient(
            160deg,
            rgba(59,130,246,.15),
            rgba(168,85,247,.08),
            transparent 60%
          );
          -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        /* ─── Responsive ─── */
        @media (max-width: 680px) {
          .modules-grid { grid-template-columns: 1fr; }
          .stats-row { grid-template-columns: repeat(2, 1fr); }
          .dash-greeting { font-size: 26px; }
        }
        @media (max-width: 900px) and (min-width: 681px) {
          .modules-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 480px) {
          .stats-row { grid-template-columns: 1fr; }
          .nav-right { gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
        }
      `}</style>

      <div className="dash-page">
        <AnimatedBackground />
        <div className="blob blob-a" />
        <div className="blob blob-b" />

        {/* ─── Navbar ─── */}
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

              <div className="nav-separator" />

              <motion.button
                className="btn-switch-system"
                onClick={handleSwitchSystem}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                <RefreshCw size={13} />
                Cambiar Sistema
              </motion.button>

              <motion.button
                className="btn-logout"
                onClick={handleLogout}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                <LogOut size={13} />
                Salir
              </motion.button>
            </div>
          </div>
        </nav>

        {/* ─── Main content ─── */}
        <main className="dash-main">

          {/* ── Hero header ── */}
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
            <p className="dash-date">{capitalizedDate}</p>
            <motion.hr
              className="dash-rule"
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.35, duration: 0.7 }}
            />
          </motion.div>

          {/* ── Quick stats row ── */}
          <div className="stats-row">
            {statCards.map((sc, i) => (
              <motion.div
                key={sc.key}
                className="stat-card"
                style={{
                  '--stat-bg': sc.bg,
                  '--stat-border': sc.border,
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.08, duration: 0.45 }}
              >
                <div className="stat-icon-wrap">
                  <sc.icon size={20} style={{ color: sc.color }} />
                </div>
                <div>
                  <div className="stat-value">
                    <AnimatedCounter target={stats[sc.key]} />
                  </div>
                  <div className="stat-label">{sc.label}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Module cards grid ── */}
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
                  '--card-glow':     mod.accentGlow,
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

          {/* ── Calendar section ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <p className="section-label">
              <Calendar size={14} className="section-label-icon" />
              Calendario de entregas
            </p>
            <div className="calendar-wrap">
              <DeliveryCalendar />
            </div>
          </motion.div>
        </main>
      </div>
    </>
  )
}
import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus, Search, Wrench, ArrowLeft, ChevronRight,
  Calendar, Clock, AlertCircle, ChevronDown, Download
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getRepairs, updateRepairStatus } from '../api/repairs'
import AnimatedBackground from '../components/AnimatedBackground'
import { generateRepairPDF } from '../utils/generateRepairPDF'
import api from '../api/client'
import WhatsAppButton from '../components/WhatsAppButton'

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  recibido:            { label: 'Recibido',            dot: '#60a5fa', badge: 'badge-info'    },
  diagnostico:         { label: 'Diagnóstico',          dot: '#fbbf24', badge: 'badge-warning' },
  esperando_repuesto:  { label: 'Esperando repuesto',   dot: '#fb923c', badge: 'badge-warning' },
  presupuesto_enviado: { label: 'Presupuesto enviado',  dot: '#a78bfa', badge: 'badge-purple'  },
  en_reparacion:       { label: 'En reparación',        dot: '#38bdf8', badge: 'badge-info'    },
  listo:               { label: 'Listo',                dot: '#34d399', badge: 'badge-success' },
  entregado:           { label: 'Entregado',            dot: '#9ca3af', badge: 'badge-neutral'  },
  cancelado:           { label: 'Cancelado',            dot: '#f87171', badge: 'badge-danger'  },
}

const ALL_STATUSES = Object.keys(STATUS_CONFIG)

// ─── Badge ────────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.recibido
  return (
    <span className={`repair-badge ${cfg.badge}`}>
      <span className="badge-dot" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

// ─── Status dropdown ──────────────────────────────────────────────────────────
function StatusDropdown({ repair, onUpdate }) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = async (newStatus) => {
    if (newStatus === repair.status) { setOpen(false); return }
    setLoading(true)
    setOpen(false)
    try { await onUpdate(repair.id, newStatus) }
    finally { setLoading(false) }
  }

  return (
    <div className="status-dropdown-wrap">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        disabled={loading}
        className="status-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {loading ? (
          <span className="trigger-label muted">Actualizando…</span>
        ) : (
          <>
            <span className="trigger-label">Estado</span>
            <ChevronDown size={12} className={`trigger-chevron ${open ? 'open' : ''}`} />
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="dropdown-backdrop" onClick={() => setOpen(false)} />
            <motion.ul
              role="listbox"
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit=   {{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="status-menu"
            >
              {ALL_STATUSES.map(s => {
                const cfg = STATUS_CONFIG[s]
                const active = s === repair.status
                return (
                  <li
                    key={s}
                    role="option"
                    aria-selected={active}
                    onClick={() => handleChange(s)}
                    className={`menu-item ${active ? 'menu-item--active' : ''}`}
                  >
                    <span className="menu-dot" style={{ background: cfg.dot }} />
                    <span className="menu-label">{cfg.label}</span>
                    {active && <span className="menu-current">actual</span>}
                  </li>
                )
              })}
            </motion.ul>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Delivery badge ───────────────────────────────────────────────────────────
function DeliveryBadge({ date }) {
  if (!date) return null
  const diffDays = Math.ceil((new Date(date) - new Date()) / 86_400_000)
  const overdue  = diffDays < 0
  const urgent   = !overdue && diffDays <= 2
  const soon     = !overdue && diffDays <= 7

  const Icon  = overdue ? AlertCircle : diffDays <= 2 ? Clock : Calendar
  const cls   = overdue ? 'delivery--danger' : urgent ? 'delivery--warn' : soon ? 'delivery--soon' : ''
  const label = overdue ? `Vencido hace ${Math.abs(diffDays)}d` : diffDays === 0 ? 'Hoy' : `${diffDays}d`

  return (
    <span className={`delivery ${cls}`}>
      <Icon size={11} />
      {label}
    </span>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RepairsPage() {
  const navigate = useNavigate()
  const [repairs,      setRepairs]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchRepairs = async () => {
    setLoading(true)
    try {
      const params = statusFilter ? { status: statusFilter } : {}
      const res = await getRepairs(params)
      setRepairs(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRepairs() }, [statusFilter])

  const handleQuickPDF = async (repair, e) => {
    e.stopPropagation()
    try {
      const res = await api.get(`/clients/${repair.client_id}`)
      generateRepairPDF(repair, res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleStatusUpdate = async (repairId, newStatus) => {
    try {
      await updateRepairStatus(repairId, { new_status: newStatus })
      await fetchRepairs()
    } catch (err) {
      console.error(err)
    }
  }

  const filtered = repairs.filter(r =>
    [r.order_number, r.brand, r.model, r.reported_issue]
      .some(f => f.toLowerCase().includes(search.toLowerCase()))
  )

  const stats = {
    activas:  repairs.filter(r => !['entregado','cancelado'].includes(r.status)).length,
    listas:   repairs.filter(r => r.status === 'listo').length,
    vencidas: repairs.filter(r => {
      if (!r.estimated_delivery) return false
      return new Date(r.estimated_delivery) < new Date() && !['entregado','cancelado'].includes(r.status)
    }).length,
  }

  return (
    <>
      {/* ── Scoped styles ─────────────────────────────────────────────────── */}
      <style>{`
        /* Page shell */
        .repairs-page {
          min-height: 100vh;
          background: #050508;
          color: #f1f5f9;
          font-family: 'Inter', system-ui, sans-serif;
          position: relative;
          overflow: hidden;
        }

        /* Ambient blobs — decorative only */
        .blob {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(80px);
        }
        .blob-a { top: 0;    left: 25%;  width: 380px; height: 380px; background: rgba(6,182,212,.045); }
        .blob-b { bottom: 0; right: 25%; width: 380px; height: 380px; background: rgba(168,85,247,.045); }

        /* ── Navbar ───────────────────────────────────────────────────────── */
        .repairs-nav {
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
          gap: 16px;
          flex-wrap: wrap;
        }
        .nav-left { display: flex; align-items: center; gap: 12px; }
        .nav-back {
          width: 34px; height: 34px;
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 8px;
          background: transparent;
          color: #94a3b8;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: color .15s, border-color .15s, background .15s;
        }
        .nav-back:hover { color: #e2e8f0; border-color: rgba(255,255,255,.2); background: rgba(255,255,255,.05); }
        .nav-title {
          font-size: 17px;
          font-weight: 600;
          letter-spacing: -.01em;
          background: linear-gradient(130deg, #06b6d4, #a855f7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .nav-sub { font-size: 11px; color: #475569; margin-top: 1px; }

        .btn-new {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #fff;
          background: linear-gradient(135deg, #06b6d4, #a855f7);
          border: none;
          cursor: pointer;
          transition: opacity .15s, transform .1s;
          white-space: nowrap;
        }
        .btn-new:hover  { opacity: .9; }
        .btn-new:active { transform: scale(.97); }

        /* ── Main content ─────────────────────────────────────────────────── */
        .repairs-main {
          position: relative;
          z-index: 10;
          max-width: 960px;
          margin: 0 auto;
          padding: 32px 24px 48px;
        }

        /* ── Stats grid ───────────────────────────────────────────────────── */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 28px;
        }
        .stat-card {
          background: rgba(255,255,255,.03);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 12px;
          padding: 16px 18px;
        }
        .stat-num  { font-size: 28px; font-weight: 700; line-height: 1; }
        .stat-label{ font-size: 12px; color: #64748b; margin-top: 6px; }
        .c-info    { color: #38bdf8; }
        .c-success { color: #34d399; }
        .c-danger  { color: #f87171; }

        /* ── Filter bar ───────────────────────────────────────────────────── */
        .filter-bar {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }
        .search-wrap {
          position: relative;
          flex: 1;
          min-width: 200px;
        }
        .search-icon {
          position: absolute;
          left: 11px; top: 50%;
          transform: translateY(-50%);
          color: #475569;
          pointer-events: none;
        }
        .search-input {
          width: 100%;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 9px;
          padding: 9px 12px 9px 34px;
          font-size: 13px;
          color: #e2e8f0;
          outline: none;
          transition: border-color .15s;
        }
        .search-input::placeholder { color: #475569; }
        .search-input:focus { border-color: rgba(6,182,212,.45); }

        .filter-pills { display: flex; gap: 6px; flex-wrap: wrap; }
        .pill {
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 500;
          border: 1px solid rgba(255,255,255,.09);
          background: transparent;
          color: #64748b;
          cursor: pointer;
          transition: all .15s;
          white-space: nowrap;
        }
        .pill:hover          { color: #cbd5e1; border-color: rgba(255,255,255,.18); }
        .pill.pill--active   { background: rgba(6,182,212,.12); border-color: rgba(6,182,212,.35); color: #38bdf8; }

        /* ── Table ────────────────────────────────────────────────────────── */
        .repairs-table {
          background: rgba(255,255,255,.02);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 14px;
          overflow: hidden;
        }
        .table-head {
          display: grid;
          grid-template-columns: 115px 1fr 150px 110px 100px 180px;
          padding: 10px 16px;
          border-bottom: 1px solid rgba(255,255,255,.06);
          background: rgba(255,255,255,.025);
        }
        .th {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: .06em;
          color: #334155;
        }

        /* ── Repair row ───────────────────────────────────────────────────── */
        .repair-row {
          display: grid;
          grid-template-columns: 115px 1fr 150px 110px 100px 180px;
          align-items: center;
          padding: 13px 16px;
          border-bottom: 1px solid rgba(255,255,255,.05);
          cursor: pointer;
          transition: background .12s;
        }
        .repair-row:last-child { border-bottom: none; }
        .repair-row:hover { background: rgba(255,255,255,.03); }

        .order-num {
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 12px;
          font-weight: 600;
          background: linear-gradient(130deg, #06b6d4, #a855f7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .order-date { font-size: 11px; color: #334155; margin-top: 2px; }

        .device-name  { font-size: 13px; font-weight: 500; color: #e2e8f0; }
        .device-issue {
          font-size: 12px; color: #475569; margin-top: 2px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 320px;
        }

        /* Badges */
        .repair-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 500;
          border: 1px solid;
          white-space: nowrap;
        }
        .badge-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

        .badge-info    { background: rgba(56,189,248,.10); border-color: rgba(56,189,248,.30); color: #38bdf8; }
        .badge-warning { background: rgba(251,191,36,.10); border-color: rgba(251,191,36,.30); color: #fbbf24; }
        .badge-success { background: rgba(52,211,153,.10); border-color: rgba(52,211,153,.30); color: #34d399; }
        .badge-danger  { background: rgba(248,113,113,.10); border-color: rgba(248,113,113,.30); color: #f87171; }
        .badge-neutral { background: rgba(148,163,184,.08); border-color: rgba(148,163,184,.20); color: #64748b; }
        .badge-purple  { background: rgba(167,139,250,.10); border-color: rgba(167,139,250,.30); color: #a78bfa; }

        /* Delivery */
        .delivery {
          display: flex; align-items: center; gap: 4px;
          font-size: 12px;
          color: #475569;
        }
        .delivery--warn   { color: #fbbf24; }
        .delivery--soon   { color: #fb923c; }
        .delivery--danger { color: #f87171; }

        /* ── Status dropdown ──────────────────────────────────────────────── */
        .status-dropdown-wrap { position: relative; }
        .status-trigger {
          display: flex; align-items: center; gap: 5px;
          padding: 5px 10px;
          border-radius: 7px;
          font-size: 12px;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.09);
          color: #64748b;
          cursor: pointer;
          transition: all .15s;
          white-space: nowrap;
        }
        .status-trigger:hover:not(:disabled) {
          background: rgba(255,255,255,.07);
          color: #cbd5e1;
          border-color: rgba(255,255,255,.15);
        }
        .status-trigger:disabled { opacity: .5; cursor: not-allowed; }
        .trigger-label { font-size: 12px; }
        .trigger-label.muted { color: #475569; }
        .trigger-chevron { transition: transform .15s; }
        .trigger-chevron.open { transform: rotate(180deg); }

        .dropdown-backdrop { position: fixed; inset: 0; z-index: 20; }
        .status-menu {
          position: absolute;
          right: 0; top: calc(100% + 4px);
          z-index: 30;
          background: #0f1117;
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 10px;
          overflow: hidden;
          min-width: 190px;
          box-shadow: 0 12px 32px rgba(0,0,0,.6);
          list-style: none;
          padding: 4px;
        }
        .menu-item {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 10px;
          border-radius: 6px;
          font-size: 12px;
          color: #94a3b8;
          cursor: pointer;
          transition: background .12s, color .12s;
        }
        .menu-item:hover:not(.menu-item--active) { background: rgba(255,255,255,.05); color: #e2e8f0; }
        .menu-item--active { color: #64748b; cursor: default; }
        .menu-dot     { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .menu-label   { flex: 1; }
        .menu-current { font-size: 11px; color: #334155; }

        /* ── Row action button ────────────────────────────────────────────── */
        .row-action {
          width: 30px; height: 30px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 7px;
          border: 1px solid rgba(255,255,255,.07);
          background: transparent;
          color: #334155;
          cursor: pointer;
          transition: all .15s;
        }
        .row-action:hover { background: rgba(255,255,255,.06); color: #94a3b8; border-color: rgba(255,255,255,.14); }

        /* ── Skeleton / Empty ─────────────────────────────────────────────── */
        .skeleton {
          height: 56px;
          border-radius: 10px;
          background: rgba(255,255,255,.03);
          animation: pulse 1.4s ease-in-out infinite;
          margin-bottom: 8px;
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.45} }

        .empty-state {
          text-align: center;
          padding: 80px 24px;
        }
        .empty-icon { color: #1e293b; margin: 0 auto 16px; display: block; }
        .empty-text { color: #475569; font-size: 14px; }
        .empty-cta  {
          margin-top: 12px;
          display: inline-block;
          font-size: 13px;
          color: #38bdf8;
          background: none;
          border: none;
          cursor: pointer;
          transition: color .15s;
        }
        .empty-cta:hover { color: #7dd3fc; }

        /* ── Responsive ───────────────────────────────────────────────────── */
        @media (max-width: 720px) {
          .table-head { display: none; }
          .repair-row {
            display: grid;
            grid-template-areas:
              "order status"
              "device delivery"
              "dropdown actions";
            grid-template-columns: 1fr auto;
            gap: 12px 16px;
            padding: 16px;
          }
          .repair-row > *:nth-child(1) { grid-area: order; }
          .repair-row > *:nth-child(2) { grid-area: device; }
          .repair-row > *:nth-child(3) { grid-area: status; justify-self: end; }
          .repair-row > *:nth-child(4) { grid-area: delivery; justify-self: end; }
          .repair-row > *:nth-child(5) { grid-area: dropdown; }
          .repair-row > *:nth-child(6) { grid-area: actions; justify-self: end; }
          .device-issue { max-width: 250px; }
          .stats-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .repairs-main { padding: 16px 12px 32px; }
          .repairs-nav { padding: 12px 16px; }
          .nav-inner { gap: 10px; }
          .nav-title { font-size: 15px; }
          .btn-new { padding: 6px 12px; font-size: 12px; }
          .filter-bar { flex-direction: column; align-items: stretch; gap: 8px; }
          .search-wrap { width: 100%; min-width: auto; }
          .filter-pills {
            justify-content: flex-start;
            overflow-x: auto;
            padding-bottom: 6px;
            flex-wrap: nowrap;
            -webkit-overflow-scrolling: touch;
            width: 100%;
          }
          .filter-pills::-webkit-scrollbar {
            display: none;
          }
          .pill { padding: 4px 10px; font-size: 11px; }
        }
      `}</style>

      {/* ── Page shell ──────────────────────────────────────────────────── */}
      <div className="repairs-page">
        <AnimatedBackground />
        <div className="blob blob-a" />
        <div className="blob blob-b" />

        {/* Navbar */}
        <nav className="repairs-nav">
          <div className="nav-inner">
            <div className="nav-left">
              <button className="nav-back" onClick={() => navigate('/')} aria-label="Volver al inicio">
                <ArrowLeft size={16} />
              </button>
              <div>
                <div className="nav-title">Reparaciones</div>
                <div className="nav-sub">{repairs.length} órdenes en total</div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="btn-new"
              onClick={() => navigate('/repairs/new')}
            >
              <Plus size={15} />
              Nueva reparación
            </motion.button>
          </div>
        </nav>

        {/* Main */}
        <main className="repairs-main">

          {/* Stats */}
          <motion.div
            className="stats-grid"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {[
              { label: 'Activas',              value: stats.activas,  cls: 'c-info'    },
              { label: 'Listas para entregar', value: stats.listas,   cls: 'c-success' },
              { label: 'Vencidas',             value: stats.vencidas, cls: 'c-danger'  },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                className="stat-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <div className={`stat-num ${s.cls}`}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Filter bar */}
          <motion.div
            className="filter-bar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.18 }}
          >
            <div className="search-wrap">
              <Search size={14} className="search-icon" />
              <input
                className="search-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por orden, marca, modelo..."
              />
            </div>

            <div className="filter-pills">
              <button
                className={`pill ${statusFilter === '' ? 'pill--active' : ''}`}
                onClick={() => setStatusFilter('')}
              >
                Todos
              </button>
              {ALL_STATUSES.map(s => (
                <button
                  key={s}
                  className={`pill ${statusFilter === s ? 'pill--active' : ''}`}
                  onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
                >
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Table */}
          {loading ? (
            <div>
              {[1, 2, 3].map(i => <div key={i} className="skeleton" />)}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Wrench size={44} className="empty-icon" />
              <p className="empty-text">No se encontraron reparaciones</p>
              <button className="empty-cta" onClick={() => navigate('/repairs/new')}>
                + Crear primera reparación
              </button>
            </motion.div>
          ) : (
            <div className="repairs-table">
              <div className="table-head">
                <span className="th">Orden</span>
                <span className="th">Dispositivo</span>
                <span className="th">Estado</span>
                <span className="th">Entrega est.</span>
                <span className="th">Cambiar estado</span>
                <span className="th" />
              </div>

              <AnimatePresence mode="popLayout">
                {filtered.map((repair, i) => (
                  <motion.div
                    key={repair.id}
                    layout
                    className="repair-row"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0  }}
                    exit=   {{ opacity: 0, x: -16 }}
                    transition={{ delay: i * 0.035 }}
                    onClick={() => navigate(`/repairs/${repair.id}`)}
                  >
                    {/* Orden */}
                    <div>
                      <div className="order-num">{repair.order_number}</div>
                      <div className="order-date">
                        {new Date(repair.created_at).toLocaleDateString('es-CL')}
                      </div>
                    </div>

                    {/* Dispositivo */}
                    <div>
                      <div className="device-name">{repair.brand} {repair.model}</div>
                      <div className="device-issue">{repair.reported_issue}</div>
                    </div>

                    {/* Estado */}
                    <div onClick={e => e.stopPropagation()}>
                      <StatusBadge status={repair.status} />
                    </div>

                    {/* Entrega estimada */}
                    <div>
                      <DeliveryBadge date={repair.estimated_delivery} />
                    </div>

                    {/* Dropdown */}
                    <div onClick={e => e.stopPropagation()}>
                      <StatusDropdown repair={repair} onUpdate={handleStatusUpdate} />
                    </div>

                    {/* Acciones */}
                    <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {repair.client?.phone && (
                        <div style={{ transform: 'scale(0.85)', transformOrigin: 'right center' }}>
                          <WhatsAppButton client={repair.client} repair={repair} />
                        </div>
                      )}
                      <button
                        onClick={(e) => handleQuickPDF(repair, e)}
                        className="row-action"
                        title="Descargar PDF"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        className="row-action"
                        aria-label={`Ver detalle de ${repair.order_number}`}
                        onClick={() => navigate(`/repairs/${repair.id}`)}
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>
    </>
  )
}

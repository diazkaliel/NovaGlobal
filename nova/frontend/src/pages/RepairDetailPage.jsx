import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Calendar, DollarSign, User, Wrench,
  ChevronRight, Edit2, Save, X, Download
} from 'lucide-react'
import { getRepair, updateRepairStatus, updateRepair } from '../api/repairs'
import AnimatedBackground from '../components/AnimatedBackground'
import { generateRepairPDF } from '../utils/generateRepairPDF'
import api from '../api/client'
import WhatsAppButton from '../components/WhatsAppButton'

// ─── Status config ─────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  recibido:            { label: 'Recibido',            dot: '#60a5fa', cls: 'badge-info'    },
  diagnostico:         { label: 'Diagnóstico',          dot: '#fbbf24', cls: 'badge-warning' },
  esperando_repuesto:  { label: 'Esperando repuesto',   dot: '#fb923c', cls: 'badge-warning' },
  presupuesto_enviado: { label: 'Presupuesto enviado',  dot: '#a78bfa', cls: 'badge-purple'  },
  en_reparacion:       { label: 'En reparación',        dot: '#38bdf8', cls: 'badge-info'    },
  listo:               { label: 'Listo',                dot: '#34d399', cls: 'badge-success' },
  entregado:           { label: 'Entregado',            dot: '#9ca3af', cls: 'badge-neutral' },
  cancelado:           { label: 'Cancelado',            dot: '#f87171', cls: 'badge-danger'  },
}

const ALL_STATUSES = Object.keys(STATUS_CONFIG)

// ─── InfoCard ───────────────────────────────────────────────────────────────
function InfoCard({ title, icon: Icon, iconColor, children, delay = 0 }) {
  return (
    <motion.div
      className="info-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <div className="card-header">
        {Icon && (
          <span className="card-header-icon" style={{ color: iconColor }}>
            <Icon size={13} />
          </span>
        )}
        <span className="card-header-title">{title}</span>
      </div>
      {children}
    </motion.div>
  )
}

// ─── InfoRow ────────────────────────────────────────────────────────────────
function InfoRow({ label, value, accent, isEditing, editKey, formData, setFormData, type = 'text', multiline = false }) {
  if (!isEditing && !value && value !== 0) return null
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      {isEditing && editKey ? (
        multiline ? (
          <textarea
            value={formData[editKey] || ''}
            onChange={e => setFormData({ ...formData, [editKey]: e.target.value })}
            className="field field--textarea"
            rows={2}
          />
        ) : (
          <input
            type={type}
            value={formData[editKey] || ''}
            onChange={e => setFormData({ ...formData, [editKey]: e.target.value })}
            className="field"
          />
        )
      ) : (
        <span className="info-value" style={accent ? { color: accent } : {}}>
          {value}
        </span>
      )}
    </div>
  )
}

// ─── StatusBadge ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.recibido
  return (
    <span className={`repair-badge ${cfg.cls}`}>
      <span className="badge-dot" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

// ─── Main ───────────────────────────────────────────────────────────────────
export default function RepairDetailPage() {
  const { id }      = useParams()
  const navigate    = useNavigate()

  const [repair,         setRepair]         = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [changingStatus, setChangingStatus] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [note,           setNote]           = useState('')
  const [showStatusForm, setShowStatusForm] = useState(false)
  const [isEditing,      setIsEditing]      = useState(false)
  const [formData,       setFormData]       = useState({})
  const [saving,         setSaving]         = useState(false)
  const [client,         setClient]         = useState(null)

  useEffect(() => {
    if (repair?.client_id) {
      api.get(`/clients/${repair.client_id}`)
        .then(res => setClient(res.data))
        .catch(console.error)
    }
  }, [repair])

  const fetchRepair = async () => {
    try {
      const res = await getRepair(id)
      setRepair(res.data)
      setFormData({
        device_type:        res.data.device_type,
        brand:              res.data.brand,
        model:              res.data.model,
        reported_issue:     res.data.reported_issue,
        accessories:        res.data.accessories || '',
        repair_cost:        res.data.repair_cost || '',
        deposit:            res.data.deposit || '',
        estimated_delivery: res.data.estimated_delivery
          ? res.data.estimated_delivery.split('T')[0] : '',
      })
    } catch {
      navigate('/repairs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRepair() }, [id])

  const handleStatusChange = async () => {
    if (!selectedStatus) return
    setChangingStatus(true)
    try {
      await updateRepairStatus(id, { new_status: selectedStatus, note })
      await fetchRepair()
      setShowStatusForm(false)
      setNote('')
      setSelectedStatus('')
    } finally {
      setChangingStatus(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateRepair(id, {
        ...formData,
        repair_cost:        formData.repair_cost ? parseFloat(formData.repair_cost) : null,
        deposit:            formData.deposit     ? parseFloat(formData.deposit)     : null,
        estimated_delivery: formData.estimated_delivery || null,
        accessories:        formData.accessories || null,
      })
      await fetchRepair()
      setIsEditing(false)
    } catch (err) {
      console.error(err)
      alert('Error al guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  // ── Loading ──
  if (loading) return (
    <div className="detail-loading">
      <span className="loading-dot" />
    </div>
  )
  if (!repair) return null

  const cfg     = STATUS_CONFIG[repair.status] ?? STATUS_CONFIG.recibido
  const balance = repair.repair_cost && repair.deposit
    ? repair.repair_cost - repair.deposit
    : null

  return (
    <>
      <style>{`
        /* ── Shell ──────────────────────────────────────────────────────── */
        .detail-page {
          min-height: 100vh;
          background: #050508;
          color: #f1f5f9;
          font-family: 'Inter', system-ui, sans-serif;
          position: relative;
          overflow: hidden;
        }
        .blob {
          position: fixed; border-radius: 50%; pointer-events: none; filter: blur(90px);
        }
        .blob-a { top: 25%;    left: 25%;  width: 380px; height: 380px; background: rgba(6,182,212,.04); }
        .blob-b { bottom: 25%; right: 25%; width: 380px; height: 380px; background: rgba(168,85,247,.04); }

        .detail-loading {
          min-height: 100vh; background: #050508;
          display: flex; align-items: center; justify-content: center;
        }
        .loading-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #38bdf8; animation: ping 1.2s ease-in-out infinite;
        }
        @keyframes ping { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(1.6)} }

        /* ── Navbar ─────────────────────────────────────────────────────── */
        .detail-nav {
          position: relative; z-index: 50; /* Aumentado para que los menús desplegables pasen por encima de las tarjetas */
          border-bottom: 1px solid rgba(255,255,255,.07);
          background: rgba(9,9,18,.55);
          backdrop-filter: blur(16px);
          padding: 14px 24px;
        }
        .nav-inner {
          max-width: 900px; margin: 0 auto;
          display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
        }
        .nav-left { display: flex; align-items: center; gap: 12px; }
        .nav-back {
          width: 34px; height: 34px;
          border: 1px solid rgba(255,255,255,.10); border-radius: 8px;
          background: transparent; color: #94a3b8;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all .15s;
        }
        .nav-back:hover { color: #e2e8f0; border-color: rgba(255,255,255,.2); background: rgba(255,255,255,.05); }
        .nav-order {
          font-size: 17px; font-weight: 700; letter-spacing: -.01em;
          font-family: 'JetBrains Mono','Fira Code',monospace;
          background: linear-gradient(135deg, #06b6d4, #a855f7);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .nav-date { font-size: 11px; color: #475569; margin-top: 2px; }
        .nav-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

        /* ── Buttons ────────────────────────────────────────────────────── */
        .btn-primary {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 8px;
          font-size: 13px; font-weight: 600; color: #fff;
          background: linear-gradient(135deg, #06b6d4, #a855f7);
          border: none; cursor: pointer;
          transition: opacity .15s, transform .1s;
          white-space: nowrap;
        }
        .btn-primary:hover  { opacity: .9; }
        .btn-primary:active { transform: scale(.97); }
        .btn-primary:disabled { opacity: .5; cursor: not-allowed; }

        .btn-ghost {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 12px; border-radius: 8px;
          font-size: 13px; color: #64748b;
          background: rgba(255,255,255,.03);
          border: 1px solid rgba(255,255,255,.09);
          cursor: pointer; transition: all .15s; white-space: nowrap;
        }
        .btn-ghost:hover { color: #e2e8f0; background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.15); }

        .btn-icon {
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 8px; border: 1px solid rgba(255,255,255,.09);
          background: rgba(255,255,255,.03); color: #64748b;
          cursor: pointer; transition: all .15s;
        }
        .btn-icon:hover { color: #f87171; border-color: rgba(248,113,113,.3); background: rgba(248,113,113,.07); }

        /* ── Main ───────────────────────────────────────────────────────── */
        .detail-main {
          position: relative; z-index: 10;
          max-width: 900px; margin: 0 auto;
          padding: 28px 24px 56px;
          display: flex; flex-direction: column; gap: 14px;
        }
        .detail-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
        }

        /* ── InfoCard ───────────────────────────────────────────────────── */
        .info-card {
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 14px;
          padding: 18px 18px 14px;
        }
        .card-header {
          display: flex; align-items: center; gap: 6px;
          margin-bottom: 14px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(255,255,255,.05);
        }
        .card-header-icon { display: flex; align-items: center; }
        .card-header-title {
          font-size: 10px; font-weight: 600;
          letter-spacing: .08em; text-transform: uppercase;
          color: #334155;
        }

        /* ── InfoRow ────────────────────────────────────────────────────── */
        .info-row {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 12px; padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,.04);
        }
        .info-row:last-child { border-bottom: none; }
        .info-label  { font-size: 12px; color: #475569; white-space: nowrap; padding-top: 2px; flex-shrink: 0; }
        .info-value  { font-size: 13px; font-weight: 500; color: #e2e8f0; text-align: right; }

        /* ── Client avatar area ─────────────────────────────────────────── */
        .client-avatar {
          width: 38px; height: 38px; border-radius: 10px;
          background: rgba(168,85,247,.10);
          border: 1px solid rgba(168,85,247,.20);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .device-icon-wrap {
          width: 38px; height: 38px; border-radius: 10px;
          background: rgba(6,182,212,.10);
          border: 1px solid rgba(6,182,212,.20);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .entity-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .entity-name { font-size: 14px; font-weight: 600; color: #e2e8f0; }
        .entity-sub  { font-size: 11px; color: #475569; margin-top: 1px; }

        /* ── Fields ─────────────────────────────────────────────────────── */
        .field {
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 7px;
          padding: 5px 9px;
          font-size: 13px; color: #e2e8f0;
          outline: none; text-align: right;
          max-width: 200px; width: 100%;
          transition: border-color .15s;
        }
        .field:focus { border-color: rgba(6,182,212,.45); }
        .field--textarea { resize: none; text-align: left; }

        .field-inline {
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 7px;
          padding: 5px 9px;
          font-size: 13px; font-weight: 600; color: #e2e8f0;
          outline: none; flex: 1;
          transition: border-color .15s;
        }
        .field-inline:focus { border-color: rgba(6,182,212,.45); }

        select.field-inline {
          font-size: 11px; font-weight: 400; color: #64748b;
          cursor: pointer;
        }

        /* ── Badges ─────────────────────────────────────────────────────── */
        .repair-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px; border-radius: 999px;
          font-size: 11px; font-weight: 500; border: 1px solid;
          white-space: nowrap;
        }
        .badge-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .badge-info    { background: rgba(56,189,248,.10);  border-color: rgba(56,189,248,.30);  color: #38bdf8; }
        .badge-warning { background: rgba(251,191,36,.10);  border-color: rgba(251,191,36,.30);  color: #fbbf24; }
        .badge-success { background: rgba(52,211,153,.10);  border-color: rgba(52,211,153,.30);  color: #34d399; }
        .badge-danger  { background: rgba(248,113,113,.10); border-color: rgba(248,113,113,.30); color: #f87171; }
        .badge-neutral { background: rgba(148,163,184,.08); border-color: rgba(148,163,184,.20); color: #64748b; }
        .badge-purple  { background: rgba(167,139,250,.10); border-color: rgba(167,139,250,.30); color: #a78bfa; }

        /* ── Status indicator (pulsing dot) ─────────────────────────────── */
        .status-indicator {
          display: flex; align-items: center; gap: 10px;
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 10px; padding: 12px 14px;
          margin-bottom: 12px;
        }
        .pulse-ring { position: relative; width: 10px; height: 10px; flex-shrink: 0; }
        .pulse-core {
          position: absolute; inset: 0; border-radius: 50%;
          border: 1px solid rgba(255,255,255,.15);
        }
        .pulse-wave {
          position: absolute; inset: -3px; border-radius: 50%;
          animation: wave 2s ease-in-out infinite;
        }
        @keyframes wave { 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:0;transform:scale(1.8)} }
        .status-label { font-size: 14px; font-weight: 600; }
        .btn-update {
          margin-left: auto;
          display: flex; align-items: center; gap: 5px;
          padding: 6px 12px; border-radius: 7px;
          font-size: 12px; font-weight: 600; color: #38bdf8;
          background: rgba(56,189,248,.08);
          border: 1px solid rgba(56,189,248,.20);
          cursor: pointer; transition: all .15s; white-space: nowrap;
        }
        .btn-update:hover { background: rgba(56,189,248,.15); border-color: rgba(56,189,248,.4); }

        /* ── Status grid (selector) ─────────────────────────────────────── */
        .status-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 12px;
        }
        .status-option {
          padding: 8px 6px; border-radius: 8px; border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03); font-size: 11px; font-weight: 500;
          color: #64748b; cursor: pointer; text-align: center;
          transition: all .15s; line-height: 1.3;
        }
        .status-option:hover:not(:disabled) { background: rgba(255,255,255,.07); color: #cbd5e1; border-color: rgba(255,255,255,.15); }
        .status-option:disabled { opacity: .3; cursor: not-allowed; }
        .status-option.selected { transform: scale(1.02); }

        /* ── Textarea note ──────────────────────────────────────────────── */
        .note-field {
          width: 100%; padding: 10px 12px;
          background: rgba(255,255,255,.03);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 9px; font-size: 13px; color: #e2e8f0;
          outline: none; resize: none; transition: border-color .15s;
          font-family: inherit;
        }
        .note-field::placeholder { color: #334155; }
        .note-field:focus { border-color: rgba(6,182,212,.4); }

        .form-footer {
          display: flex; justify-content: flex-end; gap: 8px;
          padding-top: 12px; border-top: 1px solid rgba(255,255,255,.05);
        }

        /* ── History ────────────────────────────────────────────────────── */
        .history-item {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,.04);
        }
        .history-item:last-child { border-bottom: none; }
        .history-dot {
          width: 8px; height: 8px; border-radius: 50%;
          flex-shrink: 0; margin-top: 4px;
          border: 1px solid rgba(255,255,255,.15);
        }
        .history-transition { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .history-from { font-size: 11px; color: #475569; }
        .history-arrow { font-size: 11px; color: #334155; }
        .history-to { font-size: 11px; font-weight: 600; }
        .history-note { font-size: 11px; color: #475569; margin-top: 3px; }
        .history-date { font-size: 11px; color: #334155; flex-shrink: 0; margin-left: auto; }
        .empty-history { font-size: 13px; color: #334155; }

        /* ── Balance row accent ─────────────────────────────────────────── */
        .balance-row { border-top: 1px solid rgba(255,255,255,.06) !important; margin-top: 4px; padding-top: 10px !important; }

        /* ── Responsive ─────────────────────────────────────────────────── */
        @media (max-width: 640px) {
          .detail-grid { grid-template-columns: 1fr; }
          .status-grid { grid-template-columns: repeat(2, 1fr); }
          .nav-actions .btn-ghost span,
          .nav-actions .btn-primary span { display: none; }
          .nav-actions .btn-primary { padding: 8px 10px; }
        }
        @media (max-width: 480px) {
          .detail-main { padding: 16px 12px 32px; }
          .detail-nav { padding: 12px 16px; }
          .nav-inner { gap: 8px; }
          .nav-order { font-size: 15px; }
          .btn-primary, .btn-ghost { font-size: 12px; padding: 6px 10px; }
        }
        @media (max-width: 400px) {
          .info-row { flex-direction: column; align-items: stretch; gap: 4px; }
          .info-value { text-align: left; }
          .field { max-width: 100%; text-align: left; }
        }
      `}</style>

      <div className="detail-page">
        <AnimatedBackground />
        <div className="blob blob-a" />
        <div className="blob blob-b" />

        {/* ── Navbar ── */}
        <nav className="detail-nav">
          <div className="nav-inner">
            <div className="nav-left">
              <button className="nav-back" onClick={() => navigate('/repairs')} aria-label="Volver">
                <ArrowLeft size={16} />
              </button>
              <div>
                <div className="nav-order">{repair.order_number}</div>
                <div className="nav-date">
                  {new Date(repair.created_at).toLocaleDateString('es-CL', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </div>
              </div>
            </div>

            <div className="nav-actions">
              <StatusBadge status={repair.status} />

              <WhatsAppButton client={client || repair.client} repair={repair} />

              <motion.button
                className="btn-primary"
                onClick={() => generateRepairPDF(repair, client)}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              >
                <Download size={14} />
                <span>Descargar PDF</span>
              </motion.button>

              {isEditing ? (
                <>
                  <button className="btn-icon" onClick={() => setIsEditing(false)} aria-label="Cancelar edición">
                    <X size={15} />
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    <Save size={14} />
                    {saving ? 'Guardando…' : 'Guardar'}
                  </button>
                </>
              ) : (
                <button className="btn-ghost" onClick={() => setIsEditing(true)}>
                  <Edit2 size={13} />
                  <span>Editar</span>
                </button>
              )}
            </div>
          </div>
        </nav>

        {/* ── Main ── */}
        <main className="detail-main">

          {/* Grid 2 col */}
          <div className="detail-grid">

            {/* Cliente */}
            <InfoCard title="Cliente" icon={User} iconColor="#a78bfa" delay={0.05}>
              <div className="entity-row">
                <div className="client-avatar">
                  <User size={16} color="#a78bfa" />
                </div>
                <div>
                  <div className="entity-name">{repair.client?.name || 'Cliente desconocido'}</div>
                  <div className="entity-sub">RUT: {repair.client?.rut || 'No registrado'}</div>
                </div>
              </div>
              <InfoRow label="Teléfono" value={repair.client?.phone || '—'} />
              <InfoRow label="Email"    value={repair.client?.email || '—'} />
              <InfoRow label="Ciudad"   value={repair.client?.city  || '—'} />
            </InfoCard>

            {/* Dispositivo */}
            <InfoCard title="Dispositivo" icon={Wrench} iconColor="#38bdf8" delay={0.1}>
              <div className="entity-row">
                <div className="device-icon-wrap">
                  <Wrench size={16} color="#38bdf8" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                      <input
                        value={formData.brand}
                        onChange={e => setFormData({ ...formData, brand: e.target.value })}
                        placeholder="Marca"
                        className="field-inline"
                      />
                      <input
                        value={formData.model}
                        onChange={e => setFormData({ ...formData, model: e.target.value })}
                        placeholder="Modelo"
                        className="field-inline"
                      />
                    </div>
                  ) : (
                    <div className="entity-name">{repair.brand} {repair.model}</div>
                  )}
                  {isEditing ? (
                    <select
                      value={formData.device_type}
                      onChange={e => setFormData({ ...formData, device_type: e.target.value })}
                      className="field-inline"
                      style={{ marginTop: 4 }}
                    >
                      {['phone','laptop','tablet','console','desktop','other'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="entity-sub" style={{ textTransform: 'capitalize' }}>{repair.device_type}</div>
                  )}
                </div>
              </div>
              <InfoRow label="Problema"   value={repair.reported_issue} isEditing={isEditing} editKey="reported_issue" formData={formData} setFormData={setFormData} multiline />
              <InfoRow label="Accesorios" value={repair.accessories}    isEditing={isEditing} editKey="accessories"     formData={formData} setFormData={setFormData} />
              {repair.device_password_encrypted && !isEditing && (
                <InfoRow label="Contraseña" value="••••••••" />
              )}
            </InfoCard>

            {/* Fechas y costos */}
            <InfoCard title="Fechas y costos" icon={Calendar} iconColor="#34d399" delay={0.15}>
              <InfoRow
                label="Fecha ingreso"
                value={new Date(repair.created_at).toLocaleDateString('es-CL')}
              />
              <InfoRow
                label="Entrega estimada"
                value={repair.estimated_delivery
                  ? new Date(repair.estimated_delivery + 'T12:00:00').toLocaleDateString('es-CL', {
                      weekday: 'long', day: 'numeric', month: 'long'
                    })
                  : 'No definida'
                }
                accent={repair.estimated_delivery ? '#38bdf8' : undefined}
                isEditing={isEditing} editKey="estimated_delivery"
                formData={formData} setFormData={setFormData} type="date"
              />
              <InfoRow
                label="Valor reparación"
                value={repair.repair_cost
                  ? `$${Number(repair.repair_cost).toLocaleString('es-CL')}`
                  : 'No definido'
                }
                accent="#34d399"
                isEditing={isEditing} editKey="repair_cost"
                formData={formData} setFormData={setFormData} type="number"
              />
              <InfoRow
                label="Abono recibido"
                value={repair.deposit
                  ? `$${Number(repair.deposit).toLocaleString('es-CL')}`
                  : '—'
                }
                accent="#fbbf24"
                isEditing={isEditing} editKey="deposit"
                formData={formData} setFormData={setFormData} type="number"
              />
              {balance !== null && !isEditing && (
                <div className="info-row balance-row">
                  <span className="info-label">Saldo pendiente</span>
                  <span className="info-value" style={{ color: balance > 0 ? '#f87171' : '#34d399' }}>
                    ${Number(balance).toLocaleString('es-CL')}
                  </span>
                </div>
              )}
            </InfoCard>

            {/* Estado */}
            <InfoCard title="Estado de la reparación" icon={Wrench} iconColor={cfg.dot} delay={0.2}>
              {!showStatusForm ? (
                <div className="status-indicator">
                  <div className="pulse-ring">
                    <span className="pulse-core" style={{ background: cfg.dot }} />
                    <span className="pulse-wave" style={{ background: cfg.dot }} />
                  </div>
                  <span className="status-label" style={{ color: cfg.dot }}>{cfg.label}</span>
                  <button className="btn-update" onClick={() => setShowStatusForm(true)}>
                    Actualizar <ChevronRight size={13} />
                  </button>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                >
                  <div className="status-grid">
                    {ALL_STATUSES.map(s => {
                      const c = STATUS_CONFIG[s]
                      const selected = selectedStatus === s
                      const current  = s === repair.status
                      return (
                        <button
                          key={s}
                          disabled={current}
                          onClick={() => setSelectedStatus(s)}
                          className={`status-option ${selected ? 'selected' : ''}`}
                          style={selected ? {
                            background: `${c.dot}18`,
                            borderColor: `${c.dot}50`,
                            color: c.dot,
                          } : {}}
                        >
                          {c.label}
                        </button>
                      )
                    })}
                  </div>
                  <textarea
                    className="note-field"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Nota sobre el cambio (opcional)…"
                    rows={2}
                  />
                  <div className="form-footer">
                    <button
                      className="btn-ghost"
                      onClick={() => { setShowStatusForm(false); setSelectedStatus(''); setNote('') }}
                    >
                      Cancelar
                    </button>
                    <button
                      className="btn-primary"
                      onClick={handleStatusChange}
                      disabled={!selectedStatus || changingStatus}
                    >
                      {changingStatus ? 'Guardando…' : 'Confirmar cambio'}
                    </button>
                  </div>
                </motion.div>
              )}
            </InfoCard>
          </div>

          {/* Historial */}
          <InfoCard title="Historial de estados" delay={0.3}>
            {!repair.history?.length ? (
              <p className="empty-history">Sin historial registrado</p>
            ) : (
              <div>
                {[...repair.history].reverse().map((h, i) => {
                  const hCfg = STATUS_CONFIG[h.new_status]
                  const from = STATUS_CONFIG[h.previous_status]
                  return (
                    <motion.div
                      key={h.id}
                      className="history-item"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.04 }}
                    >
                      <span className="history-dot" style={{ background: hCfg?.dot }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="history-transition">
                          {from && (
                            <>
                              <span className="history-from">{from.label}</span>
                              <span className="history-arrow">→</span>
                            </>
                          )}
                          <span className="history-to" style={{ color: hCfg?.dot }}>{hCfg?.label}</span>
                        </div>
                        {h.note && <p className="history-note">{h.note}</p>}
                      </div>
                      <span className="history-date">
                        {new Date(h.changed_at).toLocaleDateString('es-CL', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </InfoCard>

        </main>
      </div>
    </>
  )
}
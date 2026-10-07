import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Plus, Search, Trash2, Edit2, Eye, Printer, Download, Mail,
  CheckCircle, XCircle, Clock, Send, ChevronDown, X,
  Package, User, Calendar, DollarSign, Tag, Sparkles, MessageCircle, Link2, ExternalLink
} from 'lucide-react'
import BravoBackground from '../../components/bravo/BravoBackground'
import { getQuotations, createQuotation, updateQuotation, deleteQuotation } from '../../api/quotations'
import { getClients } from '../../api/clients'
import { getInventoryItems } from '../../api/inventory'
import { generateBravoQuotationPDF } from '../../utils/generateBravoPDF'

/* ─── Helpers ─────────────────────────────────────────────────── */
const STATUS_MAP = {
  borrador:  { label: 'Borrador',  color: 'text-zinc-400 bg-zinc-800/60 border-zinc-700/40' },
  enviada:   { label: 'Enviada',   color: 'text-blue-400 bg-blue-900/30 border-blue-700/30' },
  aceptada:  { label: 'Aceptada', color: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/30' },
  rechazada: { label: 'Rechazada', color: 'text-rose-400 bg-rose-900/30 border-rose-700/30' },
}

const STATUS_ICON = {
  borrador:  Clock,
  enviada:   Send,
  aceptada:  CheckCircle,
  rechazada: XCircle,
}

function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP.borrador
  const Icon = STATUS_ICON[status] || Clock
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border font-mono uppercase ${cfg.color}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  )
}

/* ─── Print Template ──────────────────────────────────────────── */
function printQuotation(q) {
  const dateStr = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
  const validStr = q.valid_until
    ? new Date(q.valid_until + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'Sin fecha de vencimiento'

  const rows = q.items.map(item => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #f0ebe0;">${item.description}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0ebe0;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0ebe0;text-align:right;">$${Number(item.unit_price).toLocaleString('es-CL')}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0ebe0;text-align:right;font-weight:700;">$${Number(item.subtotal).toLocaleString('es-CL')}</td>
    </tr>`).join('')

  const clientName = q.client?.name || q.client_name || 'Cliente no especificado'
  const clientPhone = q.client?.phone || q.client_phone || ''
  const clientEmail = q.client?.email || q.client_email || ''

  const win = window.open('', '_blank', 'width=900,height=700')
  win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cotización ${q.quote_number} - Personalizaciones Bravo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #fff; color: #1a1a1a; padding: 40px; max-width: 820px; margin: auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; padding-bottom: 24px; border-bottom: 3px solid #1a1a1a; }
    .brand { display: flex; flex-direction: column; }
    .brand-name { font-size: 28px; font-weight: 900; letter-spacing: -0.5px; color: #1a1a1a; }
    .brand-sub  { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 2px; margin-top: 2px; }
    .quote-meta { text-align: right; }
    .quote-num  { font-size: 22px; font-weight: 800; color: #b45309; }
    .quote-date { font-size: 12px; color: #666; margin-top: 4px; }
    .parties    { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
    .party-box  { background: #fafaf7; border: 1px solid #e8e2d5; border-radius: 10px; padding: 18px; }
    .party-label{ font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #b45309; margin-bottom: 8px; }
    .party-name { font-size: 16px; font-weight: 700; }
    .party-info { font-size: 12px; color: #555; margin-top: 4px; }
    table       { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead tr    { background: #1a1a1a; color: #fff; }
    thead th    { padding: 12px 8px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
    thead th:last-child, thead th:nth-child(2), thead th:nth-child(3) { text-align: right; }
    thead th:nth-child(2) { text-align: center; }
    tbody tr:nth-child(even) { background: #fafaf7; }
    .totals     { display: flex; justify-content: flex-end; margin-bottom: 32px; }
    .totals-box { min-width: 260px; }
    .total-row  { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #eee; }
    .total-final{ display: flex; justify-content: space-between; padding: 10px 0; font-size: 17px; font-weight: 900; border-top: 2px solid #1a1a1a; margin-top: 4px; }
    .accent     { color: #b45309; }
    .notes      { background: #fafaf7; border: 1px solid #e8e2d5; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 12px; color: #555; }
    .notes-title{ font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #b45309; margin-bottom: 6px; }
    .valid-note { text-align: center; padding: 14px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; font-size: 12px; color: #92400e; font-weight: 600; margin-bottom: 24px; }
    .footer     { text-align: center; font-size: 10px; color: #aaa; padding-top: 24px; border-top: 1px solid #eee; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div style="display: flex; align-items: center; gap: 14px;">
        <img src="/logo-bravo.jpg" style="width: 52px; height: 52px; border-radius: 12px; object-fit: cover; border: 2px solid #f97316; box-shadow: 0 4px 12px rgba(249,115,22,0.15);" alt="Bravo Logo" />
        <div>
          <div class="brand-name">Personalizaciones Bravo</div>
          <div class="brand-sub">Estampados & Personalización Textil · Quillota</div>
        </div>
      </div>
    </div>
    <div class="quote-meta">
      <div class="quote-num">${q.quote_number}</div>
      <div class="quote-date">Emitida: ${dateStr}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party-box">
      <div class="party-label">Emitido por</div>
      <div class="party-name">Personalizaciones Bravo</div>
      <div class="party-info">contacto@personalizacionesbravo.com</div>
    </div>
    <div class="party-box">
      <div class="party-label">Para</div>
      <div class="party-name">${clientName}</div>
      ${clientPhone ? `<div class="party-info">${clientPhone}</div>` : ''}
      ${clientEmail ? `<div class="party-info">${clientEmail}</div>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th>Cantidad</th>
        <th>Precio Unit.</th>
        <th>Subtotal</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="total-row"><span>Subtotal</span><span>$${Number(q.subtotal).toLocaleString('es-CL')}</span></div>
      ${Number(q.discount) > 0 ? `<div class="total-row"><span>Descuento</span><span class="accent">-$${Number(q.discount).toLocaleString('es-CL')}</span></div>` : ''}
      <div class="total-final"><span>TOTAL</span><span class="accent">$${Number(q.total).toLocaleString('es-CL')}</span></div>
    </div>
  </div>

  <div class="valid-note">⏰ Cotización válida hasta: ${validStr}</div>

  ${q.notes ? `<div class="notes"><div class="notes-title">Notas</div>${q.notes}</div>` : ''}
  ${q.terms ? `<div class="notes"><div class="notes-title">Términos y Condiciones</div>${q.terms}</div>` : ''}

  <div class="footer">Personalizaciones Bravo — Cotización generada digitalmente. No requiere firma ni timbre.</div>

  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`)
  win.document.close()
}

/* ─── Modal: Crear / Editar Cotización ───────────────────────── */
function QuotationModal({ mode, initialData, clients, inventoryItems, onSave, onClose }) {
  const isEdit = mode === 'edit'
  const [form, setForm] = useState({
    client_id: initialData?.client_id ?? '',
    client_name: initialData?.client_name ?? '',
    client_email: initialData?.client_email ?? '',
    client_phone: initialData?.client_phone ?? '',
    valid_until: initialData?.valid_until ?? '',
    notes: initialData?.notes ?? '',
    terms: initialData?.terms ?? '',
    discount: initialData?.discount ?? 0,
    items: initialData?.items?.map(i => ({
      description: i.description,
      quantity: i.quantity,
      unit_price: Number(i.unit_price),
      inventory_item_id: i.inventory_item_id ?? null,
    })) ?? [{ description: '', quantity: 1, unit_price: 0, inventory_item_id: null }],
  })
  const [saving, setSaving] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.phone.includes(clientSearch)
  )

  const subtotal = form.items.reduce((s, i) => s + (Number(i.unit_price) * Number(i.quantity)), 0)
  const total = subtotal - Number(form.discount)

  const setItem = (idx, field, value) => {
    const updated = [...form.items]
    updated[idx] = { ...updated[idx], [field]: value }
    setForm(f => ({ ...f, items: updated }))
  }

  const addItem = () => setForm(f => ({
    ...f,
    items: [...f.items, { description: '', quantity: 1, unit_price: 0, inventory_item_id: null }]
  }))

  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))

  const selectClient = (c) => {
    setForm(f => ({
      ...f,
      client_id: c.id,
      client_name: c.name,
      client_email: c.email ?? '',
      client_phone: c.phone ?? '',
    }))
    setClientSearch(c.name)
    setShowClientDropdown(false)
  }

  const clearSelectedClient = () => {
    setForm(f => ({
      ...f,
      client_id: '',
      client_name: '',
      client_email: '',
      client_phone: '',
    }))
    setClientSearch('')
    setShowClientDropdown(false)
  }

  const selectInventoryItem = (idx, item) => {
    setItem(idx, 'description', item.name)
    setItem(idx, 'unit_price', Number(item.sale_price))
    setItem(idx, 'inventory_item_id', item.id)
  }

  const handleSave = async () => {
    if (!form.items.length || form.items.some(i => !i.description?.trim())) {
      alert('Todos los ítems deben tener una descripción.')
      return
    }
    setSaving(true)
    try {
      const sanitizedData = {
        ...form,
        system: 'bravo',
        client_id: form.client_id ? Number(form.client_id) : null,
        client_name: form.client_name?.trim() || null,
        client_email: form.client_email?.trim() || null,
        client_phone: form.client_phone?.trim() || null,
        valid_until: form.valid_until ? form.valid_until : null,
        notes: form.notes?.trim() || null,
        terms: form.terms?.trim() || null,
        discount: Number(form.discount) || 0,
        items: form.items.map(i => ({
          description: i.description.trim(),
          quantity: Math.max(1, parseInt(i.quantity, 10) || 1),
          unit_price: Math.max(0, Number(i.unit_price) || 0),
          inventory_item_id: i.inventory_item_id ? Number(i.inventory_item_id) : null,
        })),
      }
      await onSave(sanitizedData)
    } catch (err) {
      console.error('Error al guardar cotización:', err)
      const detail = err.response?.data?.detail
      let msg = 'No se pudo guardar la cotización.'
      if (typeof detail === 'string') {
        msg = detail
      } else if (Array.isArray(detail)) {
        msg = detail.map(d => `${d.loc?.slice(1)?.join('.') || 'campo'}: ${d.msg}`).join('\n')
      } else if (err.message) {
        msg = err.message
      }
      alert(`Error al guardar la cotización:\n${msg}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0e0e15] border border-bravo-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-bravo-border sticky top-0 bg-[#0e0e15] z-10">
          <div>
            <h2 className="text-lg font-black text-white font-mono">
              {isEdit ? '✏️ Editar Cotización' : '📋 Nueva Cotización'}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">Personalizaciones Bravo</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Cliente */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-bravo-accent uppercase tracking-widest font-mono flex items-center gap-1.5">
              <User size={12} /> Cliente
            </h3>
            {form.client_id ? (
              <div className="flex items-center justify-between bg-[#151520] border border-bravo-accent/40 rounded-xl px-4 py-2.5">
                <div>
                  <p className="text-white text-sm font-bold flex items-center gap-2">
                    <span>{form.client_name}</span>
                    <span className="text-[10px] bg-bravo-accent/20 text-bravo-accent px-2 py-0.5 rounded font-mono">Registrado</span>
                  </p>
                  <p className="text-zinc-400 text-xs mt-0.5">
                    {form.client_phone || 'Sin teléfono'} {form.client_email && `• ${form.client_email}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearSelectedClient}
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold px-2.5 py-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                >
                  Cambiar / Quitar
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <input
                    className="w-full bg-[#151520] border border-bravo-border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-bravo-accent/60"
                    placeholder="Buscar cliente por nombre o teléfono..."
                    value={clientSearch}
                    onChange={e => { setClientSearch(e.target.value); setShowClientDropdown(true) }}
                    onFocus={() => setShowClientDropdown(true)}
                  />
                  {showClientDropdown && filteredClients.length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-[#0e0e15] border border-bravo-border rounded-xl mt-1 shadow-2xl z-30 max-h-44 overflow-y-auto">
                      {filteredClients.slice(0, 8).map(c => (
                        <button key={c.id} onClick={() => selectClient(c)}
                          className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-sm border-b border-bravo-border/30 last:border-0">
                          <p className="text-white font-semibold">{c.name}</p>
                          <p className="text-zinc-500 text-xs">{c.phone}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input className="bg-[#151520] border border-bravo-border rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-bravo-accent/60"
                    placeholder="Nombre del cliente" value={form.client_name}
                    onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
                  <input className="bg-[#151520] border border-bravo-border rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-bravo-accent/60"
                    placeholder="Email" value={form.client_email}
                    onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} />
                  <input className="bg-[#151520] border border-bravo-border rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-bravo-accent/60"
                    placeholder="Teléfono" value={form.client_phone}
                    onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))} />
                </div>
              </>
            )}
          </div>

          {/* Validez */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-500 font-mono uppercase tracking-widest flex items-center gap-1 mb-1.5">
                <Calendar size={11} /> Válida hasta
              </label>
              <input type="date" className="w-full bg-[#151520] border border-bravo-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-bravo-accent/60"
                value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 font-mono uppercase tracking-widest flex items-center gap-1 mb-1.5">
                <Tag size={11} /> Descuento ($)
              </label>
              <input type="number" min="0" className="w-full bg-[#151520] border border-bravo-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-bravo-accent/60"
                value={form.discount} onChange={e => setForm(f => ({ ...f, discount: Number(e.target.value) }))} />
            </div>
          </div>

          {/* Ítems */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-bravo-accent uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Package size={12} /> Ítems de la Cotización
              </h3>
              <button onClick={addItem} className="text-xs font-bold text-bravo-accent border border-bravo-accent/30 px-3 py-1 rounded-lg hover:bg-bravo-accent/10 transition-colors flex items-center gap-1">
                <Plus size={12} /> Agregar ítem
              </button>
            </div>

            {form.items.map((item, idx) => (
              <div key={idx} className="bg-[#151520] border border-bravo-border/60 rounded-xl p-4 space-y-3">
                {/* Descripción + selección inventario */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-mono mb-1 block">Descripción</label>
                    <input className="w-full bg-[#0e0e15] border border-bravo-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-bravo-accent/60"
                      placeholder="Ej: Polera DTF 30x30cm, DTF UV logo en termo..." value={item.description}
                      onChange={e => setItem(idx, 'description', e.target.value)} />
                  </div>
                  {inventoryItems.length > 0 && (
                    <div className="w-48">
                      <label className="text-[10px] text-zinc-500 uppercase font-mono mb-1 block">Desde Inventario</label>
                      <select className="w-full bg-[#0e0e15] border border-bravo-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-bravo-accent/60"
                        value={item.inventory_item_id ?? ''}
                        onChange={e => {
                          const found = inventoryItems.find(i => i.id === Number(e.target.value))
                          if (found) selectInventoryItem(idx, found)
                        }}>
                        <option value="">— Personalizado —</option>
                        {inventoryItems.filter(i => i.system === 'bravo').map(i => (
                          <option key={i.id} value={i.id}>{i.name} (${Number(i.sale_price).toLocaleString('es-CL')})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase font-mono mb-1 block">Cantidad</label>
                    <input type="number" min="1" className="w-full bg-[#0e0e15] border border-bravo-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-bravo-accent/60"
                      value={item.quantity} onChange={e => setItem(idx, 'quantity', Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase font-mono mb-1 block">Precio Unitario</label>
                    <input type="number" min="0" className="w-full bg-[#0e0e15] border border-bravo-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-bravo-accent/60"
                      value={item.unit_price} onChange={e => setItem(idx, 'unit_price', Number(e.target.value))} />
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="text-[10px] text-zinc-500 uppercase font-mono mb-1 block">Subtotal</label>
                    <div className="bg-[#0e0e15] border border-bravo-border rounded-lg px-3 py-2 text-sm font-bold text-bravo-accent font-mono">
                      ${(Number(item.unit_price) * Number(item.quantity)).toLocaleString('es-CL')}
                    </div>
                  </div>
                </div>
                {form.items.length > 1 && (
                  <button onClick={() => removeItem(idx)} className="text-xs text-rose-500 hover:text-rose-400 flex items-center gap-1 transition-colors">
                    <Trash2 size={11} /> Eliminar ítem
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Totales */}
          <div className="bg-[#151520] border border-bravo-border rounded-xl p-4 space-y-2 text-sm font-mono">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal</span><span>${subtotal.toLocaleString('es-CL')}</span>
            </div>
            {Number(form.discount) > 0 && (
              <div className="flex justify-between text-rose-400">
                <span>Descuento</span><span>-${Number(form.discount).toLocaleString('es-CL')}</span>
              </div>
            )}
            <div className="flex justify-between text-white font-black text-base border-t border-bravo-border/40 pt-2">
              <span>TOTAL</span><span className="text-bravo-accent">${total.toLocaleString('es-CL')}</span>
            </div>
          </div>

          {/* Notas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-500 font-mono uppercase tracking-widest mb-1.5 block">Notas</label>
              <textarea rows={3} className="w-full bg-[#151520] border border-bravo-border rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-bravo-accent/60 resize-none"
                placeholder="Información adicional para el cliente..."
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 font-mono uppercase tracking-widest mb-1.5 block">Términos y Condiciones</label>
              <textarea rows={3} className="w-full bg-[#151520] border border-bravo-border rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-bravo-accent/60 resize-none"
                placeholder="Condiciones de pago, entrega, etc..."
                value={form.terms} onChange={e => setForm(f => ({ ...f, terms: e.target.value }))} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-bravo-border text-sm font-bold text-zinc-400 hover:bg-white/5 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-bravo-accent text-black text-sm font-black hover:bg-yellow-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <><Sparkles size={14} /> {isEdit ? 'Guardar Cambios' : 'Crear Cotización'}</>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ─── Main Page ───────────────────────────────────────────────── */
export default function BravoQuotationsPage() {
  const navigate = useNavigate()
  const [quotations, setQuotations] = useState([])
  const [clients, setClients] = useState([])
  const [inventoryItems, setInventoryItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [modal, setModal] = useState(null) // null | { mode: 'create' | 'edit', data?: quotation }

  const load = async () => {
    setLoading(true)
    try {
      const [qRes, cRes, iRes] = await Promise.all([
        getQuotations({ system: 'bravo' }),
        getClients({ system: 'bravo' }),
        getInventoryItems({ system: 'bravo' }),
      ])
      setQuotations(qRes.data)
      setClients(cRes.data)
      setInventoryItems(iRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = quotations.filter(q => {
    const nameMatch = (q.client?.name || q.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
      q.quote_number.toLowerCase().includes(search.toLowerCase())
    const statusMatch = filterStatus === 'all' || q.status === filterStatus
    return nameMatch && statusMatch
  })

  const handleSave = async (formData) => {
    if (modal.mode === 'edit') {
      await updateQuotation(modal.data.id, formData)
    } else {
      await createQuotation(formData)
    }
    setModal(null)
    await load()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta cotización permanentemente?')) return
    await deleteQuotation(id)
    await load()
  }

  const handleStatusChange = async (q, newStatus) => {
    await updateQuotation(q.id, { status: newStatus })
    await load()
  }

  const [copiedId, setCopiedId] = useState(null)

  // Construye el link público de la cotización
  const getPublicLink = (q) => {
    const base = window.location.origin
    return `${base}/bravo/cotizacion/${q.quote_number}`
  }

  // Enviar por WhatsApp y marcar como enviada
  const handleSendWhatsApp = async (q) => {
    let phone = (q.client?.phone || q.client_phone || '').replace(/[^0-9]/g, '')
    if (phone && !phone.startsWith('56')) {
      phone = `56${phone}`
    }
    const link = getPublicLink(q)
    const clientName = q.client?.name || q.client_name || 'Cliente'
    const total = Number(q.total).toLocaleString('es-CL')

    const msg = encodeURIComponent(
      `Hola ${clientName} 👋, te enviamos tu cotización oficial de *Personalizaciones Bravo*:\n\n` +
      `📋 *N° Cotización:* ${q.quote_number}\n` +
      `💰 *Total:* $${total} CLP\n\n` +
      `🔗 *Puedes revisar el detalle oficial, descargar en PDF o aceptarla aquí:*\n${link}\n\n` +
      `¡Quedamos atentos a tus comentarios! 🎨`
    )

    const waUrl = phone
      ? `https://wa.me/${phone}?text=${msg}`
      : `https://wa.me/?text=${msg}`

    window.open(waUrl, '_blank')

    // Actualizar estado a enviada automáticamente
    if (q.status === 'borrador') {
      await updateQuotation(q.id, { status: 'enviada' })
      await load()
    }
  }

  // Copiar link de cotización al portapapeles
  const handleCopyLink = (q) => {
    navigator.clipboard.writeText(getPublicLink(q))
    setCopiedId(q.id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  const stats = {
    total: quotations.length,
    borrador: quotations.filter(q => q.status === 'borrador').length,
    enviada: quotations.filter(q => q.status === 'enviada').length,
    aceptada: quotations.filter(q => q.status === 'aceptada').length,
    totalValue: quotations.filter(q => q.status === 'aceptada').reduce((s, q) => s + Number(q.total), 0),
  }

  return (
    <div className="space-y-6 relative">
      <BravoBackground />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-white font-mono flex items-center gap-2">
            <FileText size={22} className="text-bravo-accent" />
            Cotizaciones Oficiales
          </h1>
          <p className="text-xs text-zinc-500 mt-1 font-mono">Personalizaciones Bravo · Quillota, Chile</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => setModal({ mode: 'create' })}
          className="flex items-center gap-2 bg-bravo-accent text-black font-black text-sm px-5 py-2.5 rounded-xl shadow-lg hover:bg-yellow-300 transition-colors"
        >
          <Plus size={16} /> Nueva Cotización
        </motion.button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-zinc-300' },
          { label: 'Borradores', value: stats.borrador, color: 'text-zinc-400' },
          { label: 'Enviadas', value: stats.enviada, color: 'text-blue-400' },
          { label: 'Aceptadas', value: stats.aceptada, color: 'text-emerald-400' },
        ].map((s, i) => (
          <div key={i} className="bg-bravo-card border border-bravo-border/60 rounded-2xl p-4 text-center shadow">
            <p className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</p>
            <p className="text-xs text-zinc-500 uppercase font-mono mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            className="w-full bg-bravo-card border border-bravo-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-bravo-accent/60"
            placeholder="Buscar por cliente o número de cotización..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['all', 'borrador', 'enviada', 'aceptada', 'rechazada'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors border ${filterStatus === s ? 'bg-bravo-accent text-black border-bravo-accent' : 'bg-bravo-card border-bravo-border text-zinc-400 hover:border-bravo-accent/40'}`}>
              {s === 'all' ? 'Todas' : STATUS_MAP[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-bravo-card border border-bravo-border/60 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-bravo-accent/30 border-t-bravo-accent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <FileText size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-mono">No se encontraron cotizaciones</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-bravo-border/40">
                  {['N° Cotización', 'Cliente', 'Total', 'Válida hasta', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest px-5 py-4 font-mono">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((q, i) => {
                  const clientEmail = q.client?.email || q.client_email
                  const clientName = q.client?.name || q.client_name || 'Cliente'
                  const totalStr = Number(q.total).toLocaleString('es-CL')
                  const mailSubject = encodeURIComponent(`Cotización ${q.quote_number} - Personalizaciones Bravo`)
                  const mailBody = encodeURIComponent(`Hola ${clientName},\n\nTe compartimos tu cotización oficial de Personalizaciones Bravo:\n\nN°: ${q.quote_number}\nTotal: $${totalStr} CLP\n\nPuedes revisar los detalles y descargar el PDF aquí:\n${getPublicLink(q)}\n\nSaludos cordiales,\nPersonalizaciones Bravo · Quillota`)
                  
                  return (
                    <motion.tr key={q.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="border-b border-bravo-border/20 hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4">
                        <span className="text-sm font-black text-white font-mono">{q.quote_number}</span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-white">{q.client?.name || q.client_name || '—'}</p>
                        <p className="text-xs text-zinc-500">{q.client?.phone || q.client_phone || ''}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-black text-bravo-accent font-mono">${Number(q.total).toLocaleString('es-CL')}</span>
                        {Number(q.discount) > 0 && (
                          <p className="text-xs text-zinc-500">Desc. ${Number(q.discount).toLocaleString('es-CL')}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs text-zinc-400 font-mono">
                          {q.valid_until ? new Date(q.valid_until + 'T00:00:00').toLocaleDateString('es-CL') : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="relative group">
                          <div className="cursor-pointer">
                            <StatusBadge status={q.status} />
                          </div>
                          {/* Status change dropdown */}
                          <div className="absolute left-0 top-full mt-1 bg-[#0e0e15] border border-bravo-border rounded-xl shadow-2xl z-20 min-w-[140px] hidden group-hover:block">
                            {['borrador', 'enviada', 'aceptada', 'rechazada'].filter(s => s !== q.status).map(s => (
                              <button key={s} onClick={() => handleStatusChange(q, s)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition-colors">
                                <StatusBadge status={s} />
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          {/* WhatsApp */}
                          <button
                            onClick={() => handleSendWhatsApp(q)}
                            title="Enviar por WhatsApp"
                            className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <MessageCircle size={15} />
                          </button>

                          {/* Email si existe */}
                          {clientEmail && (
                            <a
                              href={`mailto:${clientEmail}?subject=${mailSubject}&body=${mailBody}`}
                              title={`Enviar por Email a ${clientEmail}`}
                              className="p-1.5 text-zinc-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <Mail size={15} />
                            </a>
                          )}

                          {/* Copiar link */}
                          <button
                            onClick={() => handleCopyLink(q)}
                            title={copiedId === q.id ? "¡Enlace copiado!" : "Copiar enlace del cliente"}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${copiedId === q.id ? 'text-emerald-400 bg-emerald-500/20' : 'text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10'}`}
                          >
                            <Link2 size={15} />
                          </button>

                          {/* Descargar PDF Directo */}
                          <button 
                            onClick={() => generateBravoQuotationPDF(q, { download: true })} 
                            title="Descargar PDF Oficial"
                            className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/15 rounded-lg transition-colors cursor-pointer"
                          >
                            <Download size={15} />
                          </button>

                          {/* Imprimir / Vista Previa */}
                          <button 
                            onClick={() => printQuotation(q)} 
                            title="Imprimir / Vista Previa"
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                          >
                            <Printer size={15} />
                          </button>

                          {/* Editar */}
                          <button onClick={() => setModal({ mode: 'edit', data: q })} title="Editar"
                            className="p-1.5 text-zinc-400 hover:text-bravo-accent hover:bg-bravo-accent/10 rounded-lg transition-colors cursor-pointer">
                            <Edit2 size={15} />
                          </button>

                          {/* Eliminar */}
                          <button onClick={() => handleDelete(q.id)} title="Eliminar"
                            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <QuotationModal
            mode={modal.mode}
            initialData={modal.data}
            clients={clients}
            inventoryItems={inventoryItems}
            onSave={handleSave}
            onClose={() => setModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

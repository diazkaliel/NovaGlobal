/**
 * bravoStatusConfig.jsx — Configuración de estados y componente StatusBadge compartido
 * 
 * Extraído de BravoOrdersPage.jsx y BravoOrderDetailPage.jsx para
 * eliminar la duplicación de código (BUG-11).
 * 
 * Importar en cualquier página de Bravo que necesite mostrar badges de estado.
 */
import React from 'react'

// ─── Configuración visual por estado ──────────────────────────────────────────
export const STATUS_CONFIG_BRAVO = {
  pendiente:           { label: 'Pendiente Web ⏳',     dot: '#fbbf24', badge: 'bg-amber-950/40 border-amber-500/30 text-amber-400 animate-pulse' },
  recibido:            { label: 'Recibido',             dot: '#3a86ff', badge: 'bg-blue-950/40 border-blue-500/30 text-blue-400' },
  diagnostico:         { label: 'En Diseño',            dot: '#ffd166', badge: 'bg-yellow-950/40 border-yellow-500/30 text-yellow-400' },
  presupuesto_enviado: { label: 'Muestra Enviada',      dot: '#a855f7', badge: 'bg-purple-950/40 border-purple-500/30 text-purple-400' },
  diseno_aprobado:     { label: 'Diseño Aprobado',      dot: '#ec4899', badge: 'bg-pink-950/40 border-pink-500/30 text-pink-400' },
  esperando_repuesto:  { label: 'Espera Insumos',       dot: '#f77f00', badge: 'bg-orange-950/40 border-orange-500/30 text-orange-400' },
  en_reparacion:       { label: 'En Producción',        dot: '#00d2de', badge: 'bg-cyan-950/40 border-cyan-500/30 text-cyan-400 font-bold' },
  listo:               { label: 'Listo p/ Entrega',     dot: '#06d6a0', badge: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400 font-bold' },
  entregado:           { label: 'Entregado',            dot: '#4a596e', badge: 'bg-stone-900 border-stone-800 text-stone-400' },
  cancelado:           { label: 'Cancelado',            dot: '#ff006e', badge: 'bg-red-950/40 border-red-500/30 text-red-400' },
  critico:             { label: 'Crítico 🚨',           dot: '#ff006e', badge: 'bg-rose-950/60 border-rose-500/40 text-rose-400 font-black animate-pulse' },
  en_garantia:         { label: 'En Garantía',          dot: '#ec4899', badge: 'bg-pink-950/40 border-pink-500/30 text-pink-400 font-bold' },
}

// ─── Labels legibles por estado ───────────────────────────────────────────────
export const STATUS_LABELS_BRAVO = {
  pendiente:           'Pendiente Web',
  recibido:            'Recibido',
  diagnostico:         'En Diseño',
  diseno_aprobado:     'Diseño Aprobado',
  esperando_repuesto:  'Espera Insumos',
  presupuesto_enviado: 'Muestra Enviada',
  en_reparacion:       'En Producción',
  listo:               'Listo p/ Entrega',
  entregado:           'Entregado',
  cancelado:           'Cancelado',
  critico:             'Crítico 🚨',
}

// ─── Secuencia de estados para avance lineal ──────────────────────────────────
export const STAGES_SEQUENCE = [
  'pendiente',
  'recibido',
  'diagnostico',
  'diseno_aprobado',
  'esperando_repuesto',
  'presupuesto_enviado',
  'en_reparacion',
  'listo',
  'entregado'
]

// ─── Componente reutilizable de badge de estado ───────────────────────────────
export function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG_BRAVO[status] ?? STATUS_CONFIG_BRAVO.recibido
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border ${cfg.badge}`}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }} />
      {cfg.label}
    </span>
  )
}

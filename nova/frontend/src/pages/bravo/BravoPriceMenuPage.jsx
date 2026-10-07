import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Printer, Search, DollarSign, TrendingUp, Sparkles,
  Tag, Check, Edit3, X, Eye, EyeOff,
  SlidersHorizontal, BookOpen, UtensilsCrossed,
  Coffee, Shirt, ShieldCheck, Package
} from 'lucide-react'
import { getInventoryItems, updateInventoryItem } from '../../api/inventory'
import BravoBackground from '../../components/bravo/BravoBackground'
import { parseError } from '../../utils/errors'

// Familias temáticas del menú para agrupar los insumos personalizables
const MENU_SECTIONS = [
  { 
    id: 'all', 
    label: 'Carta Completa', 
    icon: UtensilsCrossed 
  },
  { 
    id: 'ceramica', 
    label: 'Cerámica, Mugs & Cristalería', 
    subtitle: 'Piezas vítreas y esmaltadas con estampa de alta fidelidad resistente a lavado',
    icon: Coffee,
    keywords: ['taza', 'tazón', 'tazon', 'chopero', 'mug', 'copa', 'vaso'] 
  },
  { 
    id: 'textil', 
    label: 'Confección Textil & Algodón', 
    subtitle: 'Prendas e indumentaria con estampado DTF textil flexible de alta duración',
    icon: Shirt,
    keywords: ['polera', 'polerón', 'poleron', 'hoodie', 'crewneck', 'pechera', 'polera'] 
  },
  { 
    id: 'acero', 
    label: 'Línea Térmica & Acero Inoxidable', 
    subtitle: 'Botellas de doble pared y vasos térmicos con personalización indeleble',
    icon: Sparkles,
    keywords: ['stanley', 'termo', 'botella', 'shaker', 'aluminio', 'termico', 'térmico'] 
  },
  { 
    id: 'accesorios', 
    label: 'Accesorios & Merchandising', 
    subtitle: 'Soportes de autor listos para eventos, regalos y marcas personales',
    icon: Tag,
    keywords: ['jockey', 'totebag', 'puzle', 'poster', 'parche', 'gorro', 'llavero', 'mousepad', 'vinilo'] 
  },
]

// Generador de descripciones editoriales atractivas según el insumo
function getProductDescription(name) {
  const n = name.toLowerCase()
  if (n.includes('taz') || n.includes('mug')) {
    return 'Cerámica vitrificada esmaltada. Personalización panorámica full color con acabado brillante, resistente a microondas y lavavajillas.'
  }
  if (n.includes('chopero')) {
    return 'Vidrio satinado esmerilado de alto espesor. Tratamiento térmico especial con estampado de alta definición cromática.'
  }
  if (n.includes('polera')) {
    return 'Algodón peinado 240g premium de corte contemporáneo. Estampado digital DTF a todo color con tintas elásticas de alta duración.'
  }
  if (n.includes('poler') || n.includes('hoodie')) {
    return 'Algodón frizado 320g con costuras dobles reforzadas. Personalización frontal o dorsal de máxima nitidez y textura mate.'
  }
  if (n.includes('stanley') || n.includes('termo') || n.includes('botella')) {
    return 'Acero inoxidable 18/8 con aislamiento térmico al vacío. Personalización indeleble permanente con alta definición.'
  }
  if (n.includes('jockey')) {
    return 'Gorra estructurada de 5 paneles con visera curva y ajuste trasero. Estampa o parche de alta adherencia y detalle.'
  }
  if (n.includes('totebag')) {
    return 'Lienzo de algodón crudo 100% ecológico de alta resistencia. Estampado de gran formato ideal para uso diario o comercial.'
  }
  return 'Producto base premium de taller con personalización completa a todo color y control de calidad individual de acabado.'
}

// Técnica sugerida según el insumo
function getTechniqueBadge(name) {
  const n = name.toLowerCase()
  if (n.includes('taz') || n.includes('chopero') || n.includes('mug') || n.includes('puzle')) {
    return 'Sublimación HD 360°'
  }
  if (n.includes('stanley') || n.includes('termo') || n.includes('botella')) {
    return 'DTF UV con Relieve 3D'
  }
  if (n.includes('polera') || n.includes('poler') || n.includes('pechera') || n.includes('hoodie')) {
    return 'DTF Textil Premium'
  }
  return 'Personalización Full Color'
}

export default function BravoPriceMenuPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [showWorkshopCostDetails, setShowWorkshopCostDetails] = useState(false)
  const [menuTheme, setMenuTheme] = useState('restaurant-light') // 'restaurant-light' | 'restaurant-dark'

  // Estado de edición rápida de precio
  const [editingItemId, setEditingItemId] = useState(null)
  const [editPriceForm, setEditPriceForm] = useState({ customizationFee: '', totalPrice: '' })
  const [savingId, setSavingId] = useState(null)
  const [feedbackMessage, setFeedbackMessage] = useState(null)

  const fetchCatalog = async () => {
    setLoading(true)
    try {
      const res = await getInventoryItems({ system: 'bravo' })
      setItems(res.data)
    } catch (err) {
      console.error('Error cargando catálogo:', err)
      setFeedbackMessage({ type: 'error', text: 'Error al sincronizar con el inventario.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCatalog()
  }, [])

  // ─── REGLA ESTRICTA DE NEGOCIO: ───
  // En Bravo, TODOS los insumos registrados son productos personalizables listos para el cliente.
  // Transformamos cada insumo en su plato/producto terminado para la carta:
  const menuProducts = useMemo(() => {
    const rawInsumos = items.filter(it => it.category === 'insumo')

    return rawInsumos.map(item => {
      // Limpieza de sufijos aleatorios generados en pruebas (ej: 'Taza Blanca bcc798' -> 'Taza Blanca')
      let cleanName = item.name.replace(/\s+[a-f0-9]{6}$/i, '').trim()
      
      // Construcción del Nombre de la Carta (ej: Tazón 11oz -> Tazón 11oz Personalizado)
      let menuTitle = cleanName
      if (!menuTitle.toLowerCase().includes('personalizad')) {
        const isFeminine = menuTitle.toLowerCase().endsWith('a') || menuTitle.toLowerCase().includes('polera') || menuTitle.toLowerCase().includes('taza')
        menuTitle = `${menuTitle} ${isFeminine ? 'Personalizada' : 'Personalizado'}`
      }

      const costPrice = Number(item.cost_price || 0)
      const currentSalePrice = Number(item.sale_price || 0)

      // Cálculo del cobro de personalización:
      // Si el insumo ya tiene un precio de venta asignado en el sistema, la tarifa es la diferencia
      // Si aún no se le asignó venta, asignamos por defecto un cobro base de taller sugerido ($3.500)
      let customizationFee = 0
      let finalPrice = currentSalePrice

      if (currentSalePrice > costPrice) {
        customizationFee = currentSalePrice - costPrice
        finalPrice = currentSalePrice
      } else {
        customizationFee = Math.max(3500, Math.round(costPrice * 1.5))
        finalPrice = costPrice + customizationFee
      }

      // Clasificación en familia temática
      const nameLower = menuTitle.toLowerCase()
      let sectionId = 'accesorios'
      for (const sec of MENU_SECTIONS) {
        if (sec.keywords && sec.keywords.some(kw => nameLower.includes(kw))) {
          sectionId = sec.id
          break
        }
      }

      const marginPct = costPrice > 0 ? (customizationFee / costPrice) * 100 : 100

      return {
        ...item,
        menuTitle,
        editorialDescription: getProductDescription(menuTitle),
        techniqueBadge: getTechniqueBadge(menuTitle),
        sectionId,
        costPrice,
        customizationFee,
        finalPrice,
        marginPct
      }
    })
  }, [items])

  // Filtrado reactivo por buscador y familia
  const filteredMenu = useMemo(() => {
    return menuProducts.filter(item => {
      const matchSearch = item.menuTitle.toLowerCase().includes(search.toLowerCase()) ||
                          item.editorialDescription.toLowerCase().includes(search.toLowerCase())
      const matchCat = activeCategory === 'all' || item.sectionId === activeCategory
      return matchSearch && matchCat
    })
  }, [menuProducts, search, activeCategory])

  // Iniciar edición de precios
  const handleStartEdit = (product) => {
    setEditingItemId(product.id)
    setEditPriceForm({
      customizationFee: product.customizationFee.toString(),
      totalPrice: product.finalPrice.toString()
    })
  }

  // Recálculo dinámico al escribir en el cobro de personalización
  const handleFeeChange = (product, val) => {
    const feeNum = parseFloat(val) || 0
    setEditPriceForm({
      customizationFee: val,
      totalPrice: (product.costPrice + feeNum).toString()
    })
  }

  // Recálculo dinámico al escribir en el precio total
  const handleTotalChange = (product, val) => {
    const totalNum = parseFloat(val) || 0
    const feeNum = Math.max(0, totalNum - product.costPrice)
    setEditPriceForm({
      customizationFee: feeNum.toString(),
      totalPrice: val
    })
  }

  // Guardar en la base de datos (actualiza sale_price del insumo en el backend)
  const handleSavePrice = async (product) => {
    const numericFinal = parseFloat(editPriceForm.totalPrice)
    if (isNaN(numericFinal) || numericFinal <= 0) {
      alert('Ingresa un precio total válido mayor a 0.')
      return
    }

    setSavingId(product.id)
    try {
      await updateInventoryItem(product.id, { sale_price: numericFinal })

      // Actualización reactiva inmediata en estado
      setItems(prev => prev.map(it => it.id === product.id ? { ...it, sale_price: numericFinal } : it))
      setEditingItemId(null)
      setFeedbackMessage({ type: 'success', text: `Precio actualizado para "${product.menuTitle}": $${numericFinal.toLocaleString('es-CL')}` })
      setTimeout(() => setFeedbackMessage(null), 3500)
    } catch (err) {
      alert(parseError(err, 'Error al guardar precio en el inventario.'))
    } finally {
      setSavingId(null)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 relative text-left font-sans">
      <BravoBackground />

      {/* ─── BARRA DE CONTROL DEL MENÚ (Oculta al imprimir) ─── */}
      <div className="print:hidden flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-bravo-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-amber-500 font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center gap-1.5">
              <UtensilsCrossed size={11} />
              Carta de Taller & Menú de Personalizaciones
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-wider flex items-center gap-2.5 uppercase italic mt-1 font-mono">
            <BookOpen className="text-amber-500" size={26} />
            Carta de Precios Personalizados
          </h1>
          <p className="text-stone-400 text-xs mt-0.5">
            Generada directamente desde tus insumos con el cobro de personalización asignado.
          </p>
        </div>

        {/* Acciones principales de Barra */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Toggle de Costos Internos */}
          <button
            type="button"
            onClick={() => setShowWorkshopCostDetails(!showWorkshopCostDetails)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer font-mono ${
              showWorkshopCostDetails
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                : 'bg-zinc-900 border-zinc-800 text-stone-400 hover:text-stone-200'
            }`}
            title="Alternar desglose de costo de insumo base vs cobro de mano de obra"
          >
            {showWorkshopCostDetails ? <Eye size={14} /> : <EyeOff size={14} />}
            {showWorkshopCostDetails ? 'Ocultar Costos Taller' : 'Ver Desglose Taller'}
          </button>

          {/* Selector de Estilo de Carta en Pantalla */}
          <button
            type="button"
            onClick={() => setMenuTheme(menuTheme === 'restaurant-light' ? 'restaurant-dark' : 'restaurant-light')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-900 border border-zinc-800 text-stone-200 hover:border-amber-500/40 cursor-pointer transition-all font-mono"
            title="Cambiar estética entre papel marfil gourmet o carta bistró oscura"
          >
            <SlidersHorizontal size={14} className="text-amber-500" />
            {menuTheme === 'restaurant-light' ? 'Estilo Papel Gourmet' : 'Estilo Bistró Nocturno'}
          </button>

          {/* Botón Imprimir Carta */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4.5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/20 font-mono"
          >
            <Printer size={15} className="stroke-[2.5]" />
            Imprimir Carta Oficial
          </button>
        </div>
      </div>

      {/* Alerta de notificación flotante */}
      <AnimatePresence>
        {feedbackMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`print:hidden p-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-between ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-400'
            }`}
          >
            <span>{feedbackMessage.text}</span>
            <button onClick={() => setFeedbackMessage(null)} className="text-stone-400 hover:text-white cursor-pointer">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── FILTROS POR SECCIONES DE MENÚ (Ocultos en impresión) ─── */}
      <div className="print:hidden flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between border-b border-bravo-border/60 pb-4">
        {/* Pestañas de Familias */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {MENU_SECTIONS.map(sec => {
            const Icon = sec.icon
            const isActive = activeCategory === sec.id

            return (
              <button
                key={sec.id}
                onClick={() => setActiveCategory(sec.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap font-mono ${
                  isActive
                    ? 'bg-amber-500 text-black shadow-sm font-black'
                    : 'bg-zinc-900/80 text-stone-400 hover:text-white border border-zinc-800'
                }`}
              >
                <Icon size={13} className={isActive ? 'text-black' : 'text-amber-500'} />
                {sec.label}
              </button>
            )
          })}
        </div>

        {/* Buscador de Platos / Productos */}
        <div className="relative w-full md:w-72">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar producto en la carta..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500/60 transition-all font-mono"
          />
        </div>
      </div>

      {/* ─── VISUAL DEL MENÚ ESTILO RESTAURANTE DE ALTA GAMA ─── */}
      <div className={`transition-all duration-300 rounded-3xl p-6 sm:p-10 md:p-14 shadow-2xl ${
        menuTheme === 'restaurant-light'
          ? 'bg-[#fcfbf9] text-zinc-900 border border-[#e8e4dc]'
          : 'bg-[#0e0e12] text-stone-100 border border-amber-500/20'
      } print:bg-white print:text-zinc-950 print:p-0 print:border-none print:shadow-none print:rounded-none max-w-5xl mx-auto`}>
        
        {/* ─── PORTADA / CABECERA DEL MENÚ ─── */}
        <div className="text-center border-b-2 border-stone-800/10 dark:border-stone-200/10 print:border-zinc-900 pb-8 mb-10">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 shadow-md">
              <img
                src="/logo-bravo.jpg"
                alt="Bravo Logo"
                className="w-full h-full rounded-full object-cover border-2 border-black/80"
              />
            </div>
          </div>
          
          <span className="text-[10px] tracking-[0.3em] uppercase font-mono font-black text-amber-600 dark:text-amber-400 print:text-zinc-800 block">
            ESTUDIO DE PERSONALIZACIÓN & TALLER DE AUTOR
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-black tracking-tight mt-1 text-zinc-950 dark:text-white print:text-zinc-950 uppercase">
            CARTA DE PRECIOS & PRODUCTOS
          </h2>
          <div className="flex items-center justify-center gap-3 mt-2 text-[11px] font-mono text-stone-500 dark:text-stone-400 print:text-zinc-600">
            <span>Temporada {new Date().getFullYear()}</span>
            <span>•</span>
            <span>Valores con Personalización Incluida</span>
            <span>•</span>
            <span>Moneda: CLP</span>
          </div>
        </div>

        {/* ─── CONTENIDO DE LA CARTA POR SECCIONES ─── */}
        {loading ? (
          <div className="space-y-8 py-10">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-4 animate-pulse">
                <div className="h-6 w-48 bg-stone-300 dark:bg-zinc-800 rounded" />
                <div className="h-16 bg-stone-200 dark:bg-zinc-900 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredMenu.length === 0 ? (
          <div className="py-20 text-center">
            <Package size={40} className="mx-auto text-stone-400 mb-3" />
            <p className="text-base font-serif font-bold">No hay insumos registrados para esta sección</p>
            <p className="text-xs text-stone-500 mt-1 font-mono">Los insumos que registres en el inventario aparecerán automáticamente aquí con su valor personalizado.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {MENU_SECTIONS.filter(s => s.id !== 'all').map(section => {
              const sectionItems = filteredMenu.filter(item => item.sectionId === section.id)
              if (sectionItems.length === 0) return null

              return (
                <div key={section.id} className="break-inside-avoid space-y-6">
                  {/* Encabezado de Sección Estilo Menú Gastronómico */}
                  <div className="border-b border-stone-300 dark:border-zinc-800 print:border-zinc-400 pb-2">
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-lg sm:text-xl font-serif font-black tracking-wide text-zinc-950 dark:text-white print:text-zinc-950 flex items-center gap-2">
                        <section.icon size={18} className="text-amber-500 print:text-zinc-800" />
                        {section.label}
                      </h3>
                      <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest">
                        {sectionItems.length} {sectionItems.length === 1 ? 'Ítem' : 'Ítems'}
                      </span>
                    </div>
                    {section.subtitle && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 print:text-zinc-600 mt-0.5 font-sans italic">
                        {section.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Lista de Productos / Platos de la Sección */}
                  <div className="grid grid-cols-1 gap-6">
                    {sectionItems.map(product => {
                      const isEditing = editingItemId === product.id

                      return (
                        <div
                          key={product.id}
                          className="group relative transition-all rounded-xl p-3 hover:bg-black/5 dark:hover:bg-white/[0.02] print:p-0 print:hover:bg-transparent"
                        >
                          {/* Fila Principal: Nombre del Producto + Línea Punteada + Precio */}
                          <div className="flex items-baseline justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <span className="font-serif font-bold text-base sm:text-lg text-zinc-900 dark:text-stone-100 print:text-zinc-950 tracking-tight">
                                {product.menuTitle}
                              </span>
                              <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 print:border-zinc-400 print:text-zinc-700">
                                {product.techniqueBadge}
                              </span>
                            </div>

                            {/* Línea de Puntos Conectores Clásicos de Menú */}
                            <div className="flex-1 border-b-2 border-dotted border-stone-300 dark:border-zinc-800 print:border-zinc-400 mx-2 relative top-[-4px]" />

                            {/* Precio Destacado */}
                            <div className="text-right shrink-0">
                              {isEditing ? (
                                <div className="flex items-center gap-2 bg-black/60 p-1.5 rounded-xl border border-amber-500/60 shadow-lg">
                                  <div className="text-left font-mono">
                                    <span className="text-[8px] text-stone-400 block uppercase">Cobro Pers. ($)</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="100"
                                      value={editPriceForm.customizationFee}
                                      onChange={e => handleFeeChange(product, e.target.value)}
                                      className="w-20 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-xs font-mono text-amber-400 text-right focus:outline-none"
                                    />
                                  </div>
                                  <span className="text-stone-500 font-bold text-xs mt-3">+</span>
                                  <div className="text-left font-mono">
                                    <span className="text-[8px] text-stone-400 block uppercase">Total Carta ($)</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="100"
                                      value={editPriceForm.totalPrice}
                                      onChange={e => handleTotalChange(product, e.target.value)}
                                      className="w-22 bg-zinc-900 border border-amber-500 rounded px-1.5 py-0.5 text-xs font-mono text-white text-right focus:outline-none font-bold"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1 mt-2.5">
                                    <button
                                      type="button"
                                      onClick={() => handleSavePrice(product)}
                                      disabled={savingId === product.id}
                                      className="p-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold cursor-pointer"
                                      title="Guardar Precio Carta"
                                    >
                                      <Check size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingItemId(null)}
                                      className="p-1 rounded-lg bg-stone-700 hover:bg-stone-600 text-white cursor-pointer"
                                      title="Cancelar"
                                    >
                                      <X size={13} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-baseline gap-2">
                                  <span className="font-mono font-black text-lg sm:text-xl text-amber-600 dark:text-amber-400 print:text-zinc-950">
                                    ${product.finalPrice.toLocaleString('es-CL')}
                                  </span>
                                  {/* Botón de Edición Rápida (Oculto en Impresión) */}
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(product)}
                                    className="print:hidden opacity-0 group-hover:opacity-100 transition-opacity p-1 text-stone-400 hover:text-amber-500 cursor-pointer"
                                    title="Ajustar cobro de personalización"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Descripción Gastronómica / Editorial del Producto */}
                          <p className="text-xs text-stone-600 dark:text-stone-400 print:text-zinc-700 mt-1 pr-24 font-sans leading-relaxed">
                            {product.editorialDescription}
                          </p>

                          {/* ─── DESGLOSE DE COSTO TALLER (Visible solo si se activa el toggle, Oculto en Impresión) ─── */}
                          {showWorkshopCostDetails && (
                            <div className="print:hidden mt-2.5 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[10px] font-mono flex items-center justify-between text-stone-500 dark:text-stone-400">
                              <div className="flex items-center gap-4">
                                <span>Insumo Base: <strong className="text-stone-700 dark:text-stone-200">${product.costPrice.toLocaleString('es-CL')}</strong></span>
                                <span>+</span>
                                <span>Cobro Personalización: <strong className="text-amber-600 dark:text-amber-400">${product.customizationFee.toLocaleString('es-CL')}</strong></span>
                              </div>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                Margen Taller: {product.marginPct.toFixed(0)}%
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ─── SECCIÓN DEGUSTACIÓN / MENÚ CORPORATIVO (Escala de Descuentos) ─── */}
        <div className="mt-14 pt-8 border-t-2 border-stone-800/10 dark:border-stone-200/10 print:border-zinc-900 break-inside-avoid">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 print:text-zinc-900 flex items-center gap-1.5">
                <Sparkles size={14} />
                Escala de Pedidos por Volumen (Menú Corporativo)
              </h4>
              <p className="text-xs text-stone-600 dark:text-stone-400 print:text-zinc-700 font-sans">
                Para producciones de marcas, empresas y eventos, aplicamos tramos de descuento automáticos:
              </p>
              <ul className="text-xs font-mono space-y-1.5 pt-1 text-stone-800 dark:text-stone-200 print:text-zinc-900">
                <li className="flex justify-between border-b border-dotted border-stone-300 dark:border-zinc-800 pb-0.5">
                  <span>10 a 24 unidades idénticas</span>
                  <strong>8% de descuento</strong>
                </li>
                <li className="flex justify-between border-b border-dotted border-stone-300 dark:border-zinc-800 pb-0.5">
                  <span>25 a 49 unidades idénticas</span>
                  <strong>15% de descuento</strong>
                </li>
                <li className="flex justify-between border-b border-dotted border-stone-300 dark:border-zinc-800 pb-0.5">
                  <span>50 o más unidades (Mayorista)</span>
                  <strong className="text-amber-600 dark:text-amber-400 print:text-zinc-900">25% de descuento especial</strong>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-mono font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 print:text-zinc-900 flex items-center gap-1.5">
                <ShieldCheck size={14} />
                Condiciones del Servicio & Taller
              </h4>
              <div className="text-xs text-stone-600 dark:text-stone-400 print:text-zinc-700 space-y-2 font-sans leading-relaxed">
                <p>
                  • <strong>Personalización Integral:</strong> Todos los precios publicados incluyen el insumo base y el proceso completo de estampado DTF, sublimación o DTF UV.
                </p>
                <p>
                  • <strong>Archivos y Diseño:</strong> Aceptamos archivos en formato vectorial (AI, PDF) o imágenes PNG a 300 DPI en fondo transparente.
                </p>
                <p>
                  • <strong>Plazo de Entrega:</strong> Tiempo de producción habitual de 24 a 48 horas hábiles según volumen y stock disponible.
                </p>
              </div>
            </div>
          </div>

          {/* Pie Editorial de la Carta */}
          <div className="mt-12 pt-6 border-t border-stone-300 dark:border-zinc-800 print:border-zinc-300 text-center font-mono text-[11px] text-stone-500 dark:text-stone-400 print:text-zinc-600">
            <p className="font-bold text-zinc-950 dark:text-stone-200 print:text-zinc-950">BRAVO PERSONALIZACIONES • TALLER DE ESTAMPADO & DTF UV</p>
            <p className="mt-0.5">Contacto & Pedidos: +56 9 6754 7300 • www.bravopersonalizaciones.cl</p>
          </div>
        </div>

      </div>
    </div>
  )
}

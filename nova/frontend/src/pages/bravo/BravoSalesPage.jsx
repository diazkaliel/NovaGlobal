import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  DollarSign, Calendar, User, Search, ShoppingCart, Plus, Trash2, 
  CreditCard, CheckCircle, AlertTriangle, FileText, ShoppingBag, Eye, X,
  Coffee, Sparkles, Receipt, Coins, ChevronRight
} from 'lucide-react'
import { getSales, createSale, getSaleStats } from '../../api/sales'
import { getClients } from '../../api/clients'
import { getInventoryItems } from '../../api/inventory'
import BravoBackground from '../../components/bravo/BravoBackground'

const ESTAMPADOS_PRESETS = [
  { id: 'dtf_uv', label: '🎨 DTF UV (Stickers / Mugs / Termos)', standardPrice: 3500, placeholder: 'Ej: DTF UV 10x10 para botella' },
  { id: 'dtf_textil', label: '👕 DTF Textil (Poleras / Polerones / Ropa)', standardPrice: 5000, placeholder: 'Ej: DTF Textil espalda polera' },
  { id: 'sublimacion_taza', label: '☕ Sublimación Tazas / Chopero', standardPrice: 4500, placeholder: 'Ej: Taza blanca con foto familiar' },
  { id: 'sublimacion_botella', label: '🏺 Sublimación Botella / Termo', standardPrice: 6000, placeholder: 'Ej: Termo metálico con logo negro' },
  { id: 'otro_servicio', label: '📦 Otro Servicio Personalizado / Estampado', standardPrice: 1000, placeholder: 'Ej: Estampado vinilo o sublimación especial' },
]

export default function BravoSalesPage() {
  const [activeTab, setActiveTab] = useState('new_sale')
  
  // Pestaña izquierda en Nueva Venta ('products' o 'services')
  const [leftTab, setLeftTab] = useState('products')
  
  const [sales, setSales] = useState([])
  const [clients, setClients] = useState([])
  const [products, setProducts] = useState([])
  
  const [stats, setStats] = useState({
    total_revenue: 0,
    sales_count: 0,
    average_ticket: 0,
    by_payment_method: [],
    daily_revenue: []
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [selectedClient, setSelectedClient] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [saleType, setSaleType] = useState('directa')
  const [cart, setCart] = useState([])
  
  // Estado para la calculadora de vuelto
  const [cashReceived, setCashReceived] = useState('')
  
  // Servicios Rápidos
  const [selectedPreset, setSelectedPreset] = useState(ESTAMPADOS_PRESETS[0])
  const [presetForm, setPresetForm] = useState({
    price: ESTAMPADOS_PRESETS[0].standardPrice.toString(),
    quantity: '1',
    notes: ''
  })
  
  const [searchQuery, setSearchQuery] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [selectedSaleDetail, setSelectedSaleDetail] = useState(null)

  useEffect(() => {
    fetchInitialData()
  }, [activeTab])

  // Resetear el preset form al cambiar de preset
  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset)
    setPresetForm({
      price: preset.standardPrice.toString(),
      quantity: '1',
      notes: ''
    })
  }

  const fetchInitialData = async () => {
    setLoading(true)
    setError('')
    try {
      if (activeTab === 'new_sale') {
        const [clientsRes, productsRes] = await Promise.all([
          getClients(),
          getInventoryItems({ system: 'bravo' })
        ])
        setClients(clientsRes.data)
        setProducts(productsRes.data.filter(p => p.stock > 0))
      } else {
        const [salesRes, statsRes] = await Promise.all([
          getSales({ system: 'bravo' }),
          getSaleStats({ system: 'bravo' })
        ])
        setSales(salesRes.data)
        setStats(statsRes.data)
      }
    } catch (err) {
      console.error(err)
      setError('Error al cargar la información de ventas.')
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (product) => {
    const existing = cart.find(item => item.item_id === product.id)
    if (existing) {
      if (existing.quantity >= product.stock) {
        setError(`No puedes agregar más de ${product.stock} unidades de este producto (límite de stock).`)
        return
      }
      setCart(cart.map(item => 
        item.item_id === product.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ))
    } else {
      setCart([...cart, {
        item_id: product.id,
        name: product.name,
        quantity: 1,
        unit_price: product.sale_price
      }])
    }
    setError('')
  }

  const addPresetToCart = (e) => {
    e.preventDefault()
    if (!presetForm.price || !presetForm.quantity) {
      setError('Por favor ingresa precio y cantidad para el servicio de personalización.')
      return
    }
    
    const desc = presetForm.notes 
      ? `${selectedPreset.label.substring(3)}: ${presetForm.notes}`
      : selectedPreset.label.substring(3)

    setCart([...cart, {
      service_name: desc,
      quantity: parseInt(presetForm.quantity) || 1,
      unit_price: parseFloat(presetForm.price) || 0
    }])
    
    // Limpiar notas y cantidad del formulario
    setPresetForm(prev => ({
      ...prev,
      quantity: '1',
      notes: ''
    }))
    setError('')
  }

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  const updateQuantity = (index, val) => {
    const item = cart[index]
    if (item.item_id) {
      const origProd = products.find(p => p.id === item.item_id)
      if (origProd && val > origProd.stock) {
        setError(`No puedes exceder el stock disponible de ${origProd.stock} unidades.`)
        return
      }
    }
    setCart(cart.map((c, i) => i === index ? { ...c, quantity: Math.max(1, val) } : c))
    setError('')
  }

  const getCartTotal = () => {
    return cart.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0)
  }

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError('El carrito de compras está vacío.')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const payload = {
        system: 'bravo',
        payment_method: paymentMethod,
        sale_type: saleType,
        client_id: selectedClient ? parseInt(selectedClient) : null,
        items: cart.map(item => ({
          item_id: item.item_id || null,
          service_name: item.service_name || null,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      }
      await createSale(payload)
      setSuccess('¡Venta de Bravo registrada de manera exitosa!')
      setCart([])
      setSelectedClient('')
      setCashReceived('')
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'Error al completar la transacción de venta.')
    } finally {
      setLoading(false)
    }
  }

  const filteredSales = sales.filter(s => {
    const clientName = s.client?.name.toLowerCase() || 'cliente general'
    const query = searchQuery.toLowerCase()
    return clientName.includes(query) || s.id.toString() == query
  })

  // Calcular vuelto en efectivo
  const cartTotal = getCartTotal()
  const cashNum = parseFloat(cashReceived) || 0
  const changeAmount = cashNum - cartTotal

  return (
    <div className="p-6 space-y-6 text-bravo-text max-w-7xl mx-auto text-left relative">
      <BravoBackground />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-bravo-glow rounded-full blur-3xl pointer-events-none" />

      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-bravo-border pb-5">
        <div>
          <h1 className="text-2xl font-black text-bravo-accent tracking-wider flex items-center gap-2.5 uppercase italic">
            <DollarSign className="text-bravo-accent drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
            Ventas del Taller
          </h1>
          <p className="text-xs text-bravo-text-muted mt-1">Registra la facturación directa de mercancías o servicios de personalización de Bravo.</p>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-1 bg-[#101018] border border-bravo-border/60 p-1 rounded-xl font-mono">
          <button
            onClick={() => { setActiveTab('new_sale'); setError(''); setSuccess(''); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'new_sale' ? 'bg-bravo-accent text-black shadow-md shadow-bravo-glow/20' : 'text-bravo-text-muted hover:text-white'
            }`}
          >
            Nueva Venta
          </button>
          <button
            onClick={() => { setActiveTab('history'); setError(''); setSuccess(''); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'history' ? 'bg-bravo-accent text-black shadow-md shadow-bravo-glow/20' : 'text-bravo-text-muted hover:text-white'
            }`}
          >
            Historial Ventas
          </button>
        </div>
      </div>

      {/* Main Alert Notifications */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-rose-950/40 border border-rose-500/30 text-rose-455 rounded-xl text-xs flex items-start gap-2.5 shadow-lg">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block mb-0.5">Error de cobro</span>
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError('')} className="p-1 hover:bg-white/5 rounded-lg text-rose-400"><X size={14} /></button>
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-emerald-950/40 border border-emerald-500/30 text-emerald-450 rounded-xl text-xs flex items-start gap-2.5 shadow-lg">
            <CheckCircle size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block mb-0.5">Venta Registrada</span>
              <span>{success}</span>
            </div>
            <button type="button" onClick={() => setSuccess('')} className="p-1 hover:bg-white/5 rounded-lg text-emerald-450"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab: New Sale */}
      {activeTab === 'new_sale' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Columna Izquierda: Catálogos / Servicios (lg:col-span-7) */}
          <div className="lg:col-span-7 bg-bravo-card border border-bravo-border/60 p-5 rounded-2xl space-y-5 shadow-xl text-left flex flex-col min-h-[480px]">
            
            {/* Sub-selector de catálogo (Productos vs Servicios) */}
            <div className="flex justify-between items-center border-b border-bravo-border/20 pb-3">
              <div className="flex gap-2 p-0.5 bg-[#101017] rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setLeftTab('products')}
                  className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                    leftTab === 'products' ? 'bg-bravo-accent/15 text-bravo-accent border border-bravo-accent/30' : 'text-zinc-400 border border-transparent hover:text-white'
                  }`}
                >
                  <ShoppingBag size={12} />
                  Prendas Base
                </button>
                <button
                  type="button"
                  onClick={() => setLeftTab('services')}
                  className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                    leftTab === 'services' ? 'bg-bravo-accent/15 text-bravo-accent border border-bravo-accent/30' : 'text-zinc-400 border border-transparent hover:text-white'
                  }`}
                >
                  <Sparkles size={12} />
                  Servicios Taller
                </button>
              </div>
              <span className="text-[9px] font-mono text-bravo-text-muted uppercase font-bold tracking-widest hidden sm:block">
                {leftTab === 'products' ? 'Prendas con Stock' : 'Presets de Personalización'}
              </span>
            </div>

            {/* PESTAÑA A: PRENDAS BASE CON STOCK */}
            {leftTab === 'products' && (
              <div className="space-y-4 flex-1 flex flex-col">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-bravo-text-muted" size={14} />
                  <input
                    type="text"
                    placeholder="Buscar artículo base en el inventario..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2 pl-9 pr-4 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent transition-colors font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1 bravo-scrollbar flex-1">
                  {products
                    .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                    .map(p => (
                      <div key={p.id} className="bg-[#101017] border border-bravo-border/40 p-3.5 rounded-xl flex flex-col justify-between hover:border-bravo-accent/40 transition-all text-left">
                        <div>
                          <h4 className="font-bold text-xs text-white leading-snug truncate" title={p.name}>{p.name}</h4>
                          <span className="text-[8px] bg-zinc-900 border border-white/5 text-zinc-500 px-1.5 py-0.5 rounded uppercase font-mono mt-1 inline-block">{p.category}</span>
                        </div>
                        <div className="flex justify-between items-center mt-4 border-t border-bravo-border/15 pt-2">
                          <div className="text-left leading-tight">
                            <span className="text-xs font-black text-bravo-accent block font-mono">${parseFloat(p.sale_price).toLocaleString('es-CL')}</span>
                            <span className="text-[9px] text-stone-500 font-mono">Stock: {p.stock}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => addToCart(p)}
                            className="p-1.5 bg-bravo-accent/10 border border-bravo-accent/30 hover:bg-bravo-accent hover:text-black text-bravo-accent rounded-lg transition-all cursor-pointer active:scale-90"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                    <div className="col-span-2 text-center py-20 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20 my-auto">
                      <Receipt className="mx-auto text-zinc-650 mb-2" size={28} />
                      <p className="text-xs text-zinc-500 font-semibold">No se encontraron artículos con stock en Bravo</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PESTAÑA B: SERVICIOS DE ESTAMPADO / TALLER */}
            {leftTab === 'services' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 flex-1">
                
                {/* Panel de presets (Lado izquierdo) */}
                <div className="md:col-span-6 space-y-2.5 max-h-[380px] overflow-y-auto pr-1 bravo-scrollbar">
                  <span className="text-[9px] font-mono text-bravo-accent block uppercase font-bold tracking-widest mb-1">Elige un tipo de Estampado:</span>
                  {ESTAMPADOS_PRESETS.map((preset) => {
                    const isSelected = selectedPreset.id === preset.id
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handlePresetSelect(preset)}
                        className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected 
                            ? 'bg-bravo-accent/10 border-bravo-accent/50 text-bravo-accent font-bold' 
                            : 'bg-[#101017] border-bravo-border/40 text-zinc-400 hover:border-stone-700 hover:text-white'
                        }`}
                      >
                        <div className="text-xs truncate">
                          <p className="font-bold leading-tight">{preset.label}</p>
                          <span className="text-[9px] text-stone-500 font-mono">Estándar: ${preset.standardPrice.toLocaleString('es-CL')}</span>
                        </div>
                        <ChevronRight size={14} className={isSelected ? 'text-bravo-accent' : 'text-stone-700'} />
                      </button>
                    )
                  })}
                </div>

                {/* Formulario del preset seleccionado (Lado derecho) */}
                <form onSubmit={addPresetToCart} className="md:col-span-6 bg-[#101017] border border-bravo-border/40 p-4.5 rounded-2xl space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="border-b border-white/5 pb-2">
                      <span className="text-[8px] font-mono text-bravo-text-muted uppercase block tracking-wider">Servicio Seleccionado</span>
                      <h4 className="text-xs font-black text-white uppercase tracking-wide mt-0.5">{selectedPreset.label.substring(3)}</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5 text-left">
                        <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold tracking-wider">Precio Cobrado *</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-bold">$</span>
                          <input
                            type="number"
                            required
                            value={presetForm.price}
                            onChange={e => setPresetForm({ ...presetForm, price: e.target.value })}
                            className="w-full bg-bravo-input border border-bravo-border rounded-xl py-1.5 pl-6 pr-2 text-xs text-white focus:outline-none focus:border-bravo-accent font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5 text-left">
                        <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold tracking-wider">Cantidad *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={presetForm.quantity}
                          onChange={e => setPresetForm({ ...presetForm, quantity: e.target.value })}
                          className="w-full bg-bravo-input border border-bravo-border rounded-xl py-1.5 px-3 text-xs text-white focus:outline-none focus:border-bravo-accent font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold tracking-wider">Especificaciones / Detalles del Estampado</label>
                      <textarea
                        rows="3"
                        placeholder={selectedPreset.placeholder}
                        value={presetForm.notes}
                        onChange={e => setPresetForm({ ...presetForm, notes: e.target.value })}
                        className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-bravo-accent font-sans resize-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-bravo-accent hover:bg-amber-600 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md shadow-bravo-glow/10 active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} className="stroke-[3]" /> Agregar Servicio
                  </button>
                </form>

              </div>
            )}

          </div>

          {/* Columna Derecha: Detalle de la Venta / Carrito (lg:col-span-5) */}
          <div className="lg:col-span-5 bg-bravo-card border border-bravo-border/60 p-5 rounded-2xl flex flex-col justify-between min-h-[480px] shadow-xl text-left">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide border-b border-bravo-border/20 pb-2">
                <ShoppingCart size={16} className="text-bravo-accent" />
                Detalle de Venta
              </h3>

              {/* Client & Payment Method */}
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Cliente (Opcional)</label>
                  <select
                    value={selectedClient}
                    onChange={e => setSelectedClient(e.target.value)}
                    className="w-full bg-bravo-input border border-bravo-border rounded-lg py-1.5 px-2 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                  >
                    <option value="">Cliente General (Público)</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Medio de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full bg-bravo-input border border-bravo-border rounded-lg py-1.5 px-2 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                  >
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="transferencia">📲 Transferencia</option>
                    <option value="debito">💳 Débito</option>
                    <option value="credito">💳 Crédito</option>
                  </select>
                </div>
              </div>

              {/* Cart List */}
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 bravo-scrollbar">
                {cart.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20 text-zinc-500 text-xs">
                    El carrito de compras está vacío
                  </div>
                ) : (
                  cart.map((item, index) => (
                    <div key={index} className="flex justify-between items-center bg-[#101017] border border-bravo-border/30 p-2.5 rounded-xl text-left animate-fade-in">
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs text-white block truncate max-w-[170px]" title={item.name || item.service_name}>
                          {item.name || item.service_name}
                        </span>
                        <span className="text-[10px] text-bravo-text-muted font-mono block">
                          ${parseFloat(item.unit_price).toLocaleString('es-CL')} c/u
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => updateQuantity(index, parseInt(e.target.value) || 1)}
                          className="w-11 bg-bravo-input border border-bravo-border rounded-md py-0.5 px-1 text-center text-xs text-bravo-text focus:outline-none focus:border-bravo-accent font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => removeFromCart(index)}
                          className="p-1.5 bg-rose-950/20 border border-rose-500/20 text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Calculadora de Vuelto (Solo si el medio es Efectivo) */}
            {paymentMethod === 'efectivo' && cartTotal > 0 && (
              <div className="bg-[#101017] border border-bravo-border/20 p-3 rounded-xl space-y-2 mt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-bravo-text-muted">¿Paga Con?</span>
                  <div className="relative w-28">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 font-bold font-mono">$</span>
                    <input
                      type="number"
                      placeholder="Ej: 10000"
                      value={cashReceived}
                      onChange={e => setCashReceived(e.target.value)}
                      className="w-full bg-bravo-input border border-bravo-border rounded-lg py-1 pl-5 pr-1.5 text-xs text-right text-white focus:outline-none focus:border-bravo-accent font-mono"
                    />
                  </div>
                </div>
                {cashReceived && (
                  <div className="flex justify-between items-center border-t border-white/5 pt-1.5">
                    <span className="text-[10px] text-bravo-text-muted uppercase font-bold tracking-wider font-mono">Vuelto a entregar</span>
                    <span className={`font-mono font-black text-xs ${changeAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {changeAmount >= 0 
                        ? `$${changeAmount.toLocaleString('es-CL')}`
                        : `Faltan $${Math.abs(changeAmount).toLocaleString('es-CL')}`
                      }
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Total and Checkout */}
            <div className="border-t border-bravo-border/20 pt-4 mt-4 space-y-3">
              <div className="flex justify-between items-center text-sm font-bold uppercase tracking-wider px-1">
                <span className="text-bravo-text-muted text-xs">Total de la Venta</span>
                <span className="text-bravo-accent text-lg font-mono">${cartTotal.toLocaleString('es-CL')}</span>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={loading || cart.length === 0 || (paymentMethod === 'efectivo' && cashReceived && changeAmount < 0)}
                className="w-full py-2.5 bg-bravo-accent hover:bg-amber-600 disabled:opacity-50 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-bravo-glow/20 active:scale-95 flex items-center justify-center gap-1.5"
              >
                <ShoppingCart size={12} /> {loading ? 'Procesando Venta...' : 'Completar Cobro'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Tab: History */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-bravo-card border border-bravo-border/60 p-4 rounded-xl text-left shadow-md">
              <span className="text-[10px] text-bravo-accent tracking-widest font-mono uppercase font-bold block">Ventas Totales Hoy</span>
              <span className="text-xl font-black text-white block mt-1 font-mono">${parseFloat(stats.total_revenue).toLocaleString('es-CL')}</span>
            </div>
            <div className="bg-bravo-card border border-bravo-border/60 p-4 rounded-xl text-left shadow-md">
              <span className="text-[10px] text-bravo-accent tracking-widest font-mono uppercase font-bold block">Transacciones Procesadas</span>
              <span className="text-xl font-black text-white block mt-1 font-mono">{stats.sales_count} ventas</span>
            </div>
            <div className="bg-bravo-card border border-bravo-border/60 p-4 rounded-xl text-left shadow-md">
              <span className="text-[10px] text-bravo-accent tracking-widest font-mono uppercase font-bold block">Ticket Promedio Neto</span>
              <span className="text-xl font-black text-white block mt-1 font-mono">${parseFloat(stats.average_ticket).toLocaleString('es-CL')}</span>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-bravo-card border border-bravo-border/60 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex justify-between items-center gap-4 flex-wrap">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide border-b border-transparent pb-1 italic">
                <FileText size={16} className="text-bravo-accent" />
                Historial de Ventas del Taller
              </h3>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2 text-bravo-text-muted/65" size={14} />
                <input
                  type="text"
                  placeholder="Buscar por cliente o folio..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-bravo-input border border-bravo-border rounded-xl py-1.5 pl-9 pr-4 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent font-mono"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-bravo-border/60">
              <table className="w-full text-xs text-left border-collapse bg-[#101017]">
                <thead>
                  <tr className="bg-bravo-sidebar/70 text-bravo-text font-mono text-[9px] uppercase border-b border-bravo-border/60">
                    <th className="py-3 px-4">Folio</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Medio de Pago</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-center">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bravo-border/20 text-stone-300">
                  {filteredSales.map((s) => (
                    <tr key={s.id} className="hover:bg-white/[0.01] transition-colors border-b border-bravo-border/10">
                      <td className="py-3.5 px-4 font-mono font-bold text-bravo-accent">#{s.id}</td>
                      <td className="py-3.5 px-4 font-semibold text-white">{s.client?.name || 'Cliente General (Público)'}</td>
                      <td className="py-3.5 px-4 uppercase font-bold text-[9px] font-mono tracking-wider">
                        {s.sale_type === 'directa' ? '📦 Mercancía' : '🎨 Estampado'}
                      </td>
                      <td className="py-3.5 px-4 uppercase font-mono text-[9px]">{s.payment_method}</td>
                      <td className="py-3.5 px-4 text-bravo-text-muted font-mono">
                        {new Date(s.created_at).toLocaleDateString('es-CL', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-black text-right text-bravo-accent font-mono">${parseFloat(s.total_amount).toLocaleString('es-CL')}</td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedSaleDetail(s)}
                          className="p-1 hover:bg-white/5 text-bravo-accent rounded-lg border border-transparent hover:border-bravo-border/40 transition-all cursor-pointer"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredSales.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-12 text-bravo-text-muted italic bg-zinc-950/10">
                        No se encontraron ventas en el historial
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL */}
      <AnimatePresence>
        {selectedSaleDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onClick={() => setSelectedSaleDetail(null)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-bravo-card border border-bravo-border p-6 rounded-2xl w-full max-w-lg shadow-2xl relative space-y-4 text-left font-sans"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-bravo-border/40 pb-3">
                <div className="text-left">
                  <h3 className="font-bold text-sm text-bravo-accent font-mono">Folio #{selectedSaleDetail.id}</h3>
                  <p className="text-[10px] text-bravo-text-muted uppercase font-mono">Comprobante de Venta</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSaleDetail(null)}
                  className="p-1.5 text-bravo-text-muted hover:text-white rounded hover:bg-white/5 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs border-b border-bravo-border/30 pb-3 font-sans">
                <div>
                  <span className="text-[9px] text-bravo-text-muted uppercase font-mono block">Cliente</span>
                  <span className="text-white font-bold">{selectedSaleDetail.client?.name || 'Cliente General'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-bravo-text-muted uppercase font-mono block">Medio de Pago</span>
                  <span className="text-white font-bold uppercase font-mono">{selectedSaleDetail.payment_method}</span>
                </div>
                <div>
                  <span className="text-[9px] text-bravo-text-muted uppercase font-mono block">Tipo de Venta</span>
                  <span className="text-white font-bold uppercase">{selectedSaleDetail.sale_type}</span>
                </div>
                <div>
                  <span className="text-[9px] text-bravo-text-muted uppercase font-mono block">Fecha y Hora</span>
                  <span className="text-bravo-text-muted font-mono">
                    {new Date(selectedSaleDetail.created_at).toLocaleString('es-CL')}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <span className="text-[9px] text-bravo-text-muted uppercase font-mono block">Desglose de Compra</span>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 bravo-scrollbar">
                  {selectedSaleDetail.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center bg-[#101017] border border-bravo-border/30 p-2.5 rounded-lg text-xs font-sans">
                      <div>
                        <span className="font-bold text-white block truncate max-w-[280px]">
                          {item.item?.name || item.service_name}
                        </span>
                        <span className="text-[10px] text-bravo-text-muted font-mono">Cantidad: {item.quantity}</span>
                      </div>
                      <span className="font-bold text-bravo-accent font-mono">${parseFloat(item.unit_price * item.quantity).toLocaleString('es-CL')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-bravo-border/30 pt-3 text-sm font-bold uppercase">
                <span className="text-bravo-text-muted text-xs">Monto Total Cobrado</span>
                <span className="text-bravo-accent text-lg font-mono">${parseFloat(selectedSaleDetail.total_amount).toLocaleString('es-CL')}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  DollarSign, Calendar, User, Search, ShoppingCart, Plus, Trash2, 
  CreditCard, CheckCircle, AlertTriangle, FileText, ShoppingBag, Eye, X 
} from 'lucide-react'
import { getSales, createSale, getSaleStats } from '../../api/sales'
import { getClients } from '../../api/clients'
import { getInventoryItems } from '../../api/inventory'

export default function BravoSalesPage() {
  const [activeTab, setActiveTab] = useState('new_sale')
  
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
  
  const [manualItem, setManualItem] = useState({
    service_name: '',
    quantity: 1,
    unit_price: ''
  })
  
  const [searchQuery, setSearchQuery] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [selectedSaleDetail, setSelectedSaleDetail] = useState(null)

  useEffect(() => {
    fetchInitialData()
  }, [activeTab])

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

  const addManualItem = (e) => {
    e.preventDefault()
    if (!manualItem.service_name || !manualItem.unit_price) {
      setError('Por favor ingresa nombre y precio del servicio de personalización.')
      return
    }
    setCart([...cart, {
      service_name: manualItem.service_name,
      quantity: parseInt(manualItem.quantity) || 1,
      unit_price: parseFloat(manualItem.unit_price)
    }])
    setManualItem({ service_name: '', quantity: 1, unit_price: '' })
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

  return (
    <div className="p-6 space-y-6 text-bravo-text max-w-7xl mx-auto">
      
      {/* Title */}
      <div className="flex justify-between items-center border-b border-bravo-border pb-4">
        <div>
          <h1 className="text-2xl font-black text-bravo-accent tracking-wider flex items-center gap-2 uppercase">
            <DollarSign className="text-bravo-accent" />
            Ventas del Taller
          </h1>
          <p className="text-xs text-bravo-text-muted mt-1">Registra la facturación directa de mercancías o servicios de personalización.</p>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-1.5 bg-bravo-sidebar border border-bravo-border p-1 rounded-xl">
          <button
            onClick={() => { setActiveTab('new_sale'); setError(''); setSuccess(''); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'new_sale' ? 'bg-bravo-accent text-white' : 'text-bravo-text-muted hover:text-bravo-text'
            }`}
          >
            Nueva Venta
          </button>
          <button
            onClick={() => { setActiveTab('history'); setError(''); setSuccess(''); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'history' ? 'bg-bravo-accent text-white' : 'text-bravo-text-muted hover:text-bravo-text'
            }`}
          >
            Historial de Ventas
          </button>
        </div>
      </div>

      {/* Main Alert Notifications */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle size={14} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Tab: New Sale */}
      {activeTab === 'new_sale' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Inventory Finder */}
          <div className="lg:col-span-7 bg-bravo-card border border-bravo-border p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-bravo-text flex items-center gap-2 uppercase tracking-wide">
              <ShoppingBag size={16} className="text-bravo-accent" />
              Prendas & Productos Base
            </h3>
            
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-bravo-text-muted/65" size={14} />
              <input
                type="text"
                placeholder="Buscar artículo..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="w-full bg-bravo-input border border-bravo-border rounded-xl py-2 pl-9 pr-4 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
              {products
                .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                .map(p => (
                  <div key={p.id} className="bg-bravo-input border border-bravo-border p-3 rounded-xl flex flex-col justify-between hover:border-bravo-accent transition-all text-left">
                    <div>
                      <h4 className="font-bold text-xs text-bravo-text leading-tight">{p.name}</h4>
                      <p className="text-[10px] text-bravo-text-muted mt-1 uppercase font-mono">{p.category}</p>
                    </div>
                    <div className="flex justify-between items-center mt-3 border-t border-bravo-border/40 pt-2">
                      <div className="text-left">
                        <span className="text-[10px] text-bravo-accent font-bold block">${parseFloat(p.sale_price).toLocaleString('es-CL')}</span>
                        <span className="text-[9px] text-bravo-text-muted font-mono">Disponibles: {p.stock}</span>
                      </div>
                      <button
                        onClick={() => addToCart(p)}
                        className="p-1 bg-bravo-accent hover:bg-amber-600 text-white rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {/* Manual Service Item Form */}
            <div className="border-t border-bravo-border pt-4 mt-2">
              <h4 className="text-xs font-bold text-bravo-text mb-3 uppercase tracking-wide flex items-center gap-1.5">
                <Plus size={14} className="text-bravo-accent" />
                Agregar Servicio de Personalización (Manual)
              </h4>
              <form onSubmit={addManualItem} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6">
                  <input
                    type="text"
                    placeholder="Detalle (ej: Estampado vinilo 15x15 en polera)"
                    value={manualItem.service_name}
                    onChange={e => setManualItem({ ...manualItem, service_name: e.target.value })}
                    className="w-full bg-bravo-input border border-bravo-border rounded-lg py-1.5 px-3 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                  />
                </div>
                <div className="sm:col-span-3">
                  <input
                    type="number"
                    placeholder="Precio"
                    value={manualItem.unit_price}
                    onChange={e => setManualItem({ ...manualItem, unit_price: e.target.value })}
                    className="w-full bg-bravo-input border border-bravo-border rounded-lg py-1.5 px-3 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                  />
                </div>
                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-[#f4ebd9]/60 border border-bravo-accent/20 hover:bg-bravo-accent hover:text-white font-bold text-xs uppercase rounded-lg transition-all cursor-pointer shadow-xs"
                  >
                    Agregar
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Checkout Cart */}
          <div className="lg:col-span-5 bg-bravo-card border border-bravo-border p-5 rounded-2xl flex flex-col justify-between min-h-[480px]">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-bravo-text flex items-center gap-2 uppercase tracking-wide border-b border-bravo-border pb-2">
                <ShoppingCart size={16} className="text-bravo-accent" />
                Detalle de Venta
              </h3>

              {/* Client Selection */}
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-bravo-accent block uppercase font-bold">Cliente (Opcional)</label>
                  <select
                    value={selectedClient}
                    onChange={e => setSelectedClient(e.target.value)}
                    className="w-full bg-bravo-input border border-bravo-border rounded-lg py-1.5 px-2.5 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
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
                    className="w-full bg-bravo-input border border-bravo-border rounded-lg py-1.5 px-2.5 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                  >
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="transferencia">📲 Transferencia</option>
                    <option value="debito">💳 Débito</option>
                    <option value="credito">💳 Crédito</option>
                  </select>
                </div>
              </div>

              {/* Cart List */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-bravo-text-muted/65 text-xs">El carrito está vacío</div>
                ) : (
                  cart.map((item, index) => (
                    <div key={index} className="flex justify-between items-center bg-bravo-input border border-bravo-border/50 p-2.5 rounded-xl text-left">
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs text-bravo-text block truncate max-w-[200px]">
                          {item.name || item.service_name}
                        </span>
                        <span className="text-[10px] text-bravo-text-muted font-mono block">
                          ${parseFloat(item.unit_price).toLocaleString('es-CL')} c/u
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => updateQuantity(index, parseInt(e.target.value) || 1)}
                          className="w-12 bg-bravo-input border border-bravo-border rounded-md py-0.5 px-1 text-center text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                        />
                        <button
                          onClick={() => removeFromCart(index)}
                          className="p-1 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Total and Checkout */}
            <div className="border-t border-bravo-border pt-4 mt-4 space-y-4">
              <div className="flex justify-between items-center text-sm font-bold uppercase tracking-wider px-1">
                <span className="text-bravo-text-muted text-xs">Total Venta</span>
                <span className="text-bravo-accent text-lg">${getCartTotal().toLocaleString('es-CL')}</span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={loading || cart.length === 0}
                className="w-full py-2.5 bg-bravo-accent hover:bg-amber-600 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md hover:scale-[1.01]"
              >
                {loading ? 'Procesando Venta...' : 'Completar Cobro'}
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
            <div className="bg-bravo-card border border-bravo-border p-4 rounded-xl text-left">
              <span className="text-[10px] text-bravo-accent tracking-wider font-mono uppercase font-bold block">Venta de Hoy</span>
              <span className="text-xl font-black text-bravo-text block mt-1">${parseFloat(stats.total_revenue).toLocaleString('es-CL')}</span>
            </div>
            <div className="bg-bravo-card border border-bravo-border p-4 rounded-xl text-left">
              <span className="text-[10px] text-bravo-accent tracking-wider font-mono uppercase font-bold block">Transacciones</span>
              <span className="text-xl font-black text-bravo-text block mt-1">{stats.sales_count} ventas</span>
            </div>
            <div className="bg-bravo-card border border-bravo-border p-4 rounded-xl text-left">
              <span className="text-[10px] text-bravo-accent tracking-wider font-mono uppercase font-bold block">Ticket Promedio</span>
              <span className="text-xl font-black text-bravo-text block mt-1">${parseFloat(stats.average_ticket).toLocaleString('es-CL')}</span>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-bravo-card border border-bravo-border p-5 rounded-2xl space-y-4">
            <div className="flex justify-between items-center gap-4 flex-wrap">
              <h3 className="text-sm font-bold text-bravo-text flex items-center gap-2 uppercase tracking-wide">
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
                  className="w-full bg-bravo-input border border-bravo-border rounded-xl py-1.5 pl-9 pr-4 text-xs text-bravo-text focus:outline-none focus:border-bravo-accent"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-bravo-border">
              <table className="w-full text-xs text-left border-collapse bg-white/40">
                <thead>
                  <tr className="bg-bravo-sidebar/70 text-bravo-text font-mono text-[9px] uppercase border-b border-bravo-border">
                    <th className="py-2.5 px-4">Folio</th>
                    <th className="py-2.5 px-4">Cliente</th>
                    <th className="py-2.5 px-4">Tipo</th>
                    <th className="py-2.5 px-4">Medio de Pago</th>
                    <th className="py-2.5 px-4">Fecha</th>
                    <th className="py-2.5 px-4 text-right">Total</th>
                    <th className="py-2.5 px-4 text-center">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bravo-border/20">
                  {filteredSales.map((s) => (
                    <tr key={s.id} className="hover:bg-bravo-sidebar/10 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-bravo-accent">#{s.id}</td>
                      <td className="py-3 px-4">{s.client?.name || 'Cliente General'}</td>
                      <td className="py-3 px-4 uppercase font-bold text-[9px] font-mono tracking-wider">
                        {s.sale_type === 'directa' ? '📦 Mercancía' : '🎨 Estampado'}
                      </td>
                      <td className="py-3 px-4 uppercase font-mono text-[9px]">{s.payment_method}</td>
                      <td className="py-3 px-4 text-bravo-text-muted">
                        {new Date(s.created_at).toLocaleDateString('es-CL', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-4 font-bold text-right text-bravo-accent">${parseFloat(s.total_amount).toLocaleString('es-CL')}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedSaleDetail(s)}
                          className="p-1 hover:bg-bravo-sidebar text-bravo-accent rounded transition-colors cursor-pointer"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredSales.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-bravo-text-muted">No se encontraron ventas en el historial</td>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" onClick={() => setSelectedSaleDetail(null)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-bravo-card border border-bravo-border p-6 rounded-2xl w-full max-w-lg shadow-2xl relative space-y-4 text-left"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-bravo-border pb-3">
                <div className="text-left">
                  <h3 className="font-bold text-sm text-bravo-accent font-mono">Folio #{selectedSaleDetail.id}</h3>
                  <p className="text-[10px] text-bravo-text-muted uppercase font-mono">Comprobante de Caja</p>
                </div>
                <button
                  onClick={() => setSelectedSaleDetail(null)}
                  className="p-1.5 text-bravo-text-muted hover:text-bravo-text rounded hover:bg-bravo-sidebar cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs border-b border-bravo-border/50 pb-3">
                <div>
                  <span className="text-[9px] text-bravo-text-muted uppercase font-mono block">Cliente</span>
                  <span className="text-bravo-text font-bold">{selectedSaleDetail.client?.name || 'Cliente General'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-bravo-text-muted uppercase font-mono block">Medio de Pago</span>
                  <span className="text-bravo-text font-bold uppercase">{selectedSaleDetail.payment_method}</span>
                </div>
                <div>
                  <span className="text-[9px] text-bravo-text-muted uppercase font-mono block">Tipo de Venta</span>
                  <span className="text-bravo-text font-bold uppercase">{selectedSaleDetail.sale_type}</span>
                </div>
                <div>
                  <span className="text-[9px] text-bravo-text-muted uppercase font-mono block">Fecha y Hora</span>
                  <span className="text-bravo-text-muted">
                    {new Date(selectedSaleDetail.created_at).toLocaleString('es-CL')}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <span className="text-[9px] text-bravo-text-muted uppercase font-mono block">Desglose de Compra</span>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                  {selectedSaleDetail.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center bg-bravo-bg border border-bravo-border/30 p-2.5 rounded-lg text-xs">
                      <div>
                        <span className="font-bold text-bravo-text block truncate max-w-[280px]">
                          {item.item?.name || item.service_name}
                        </span>
                        <span className="text-[10px] text-bravo-text-muted">Cantidad: {item.quantity}</span>
                      </div>
                      <span className="font-bold text-bravo-accent">${parseFloat(item.unit_price * item.quantity).toLocaleString('es-CL')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-bravo-border pt-3 text-sm font-bold uppercase">
                <span className="text-bravo-text-muted text-xs">Monto Total Cobrado</span>
                <span className="text-bravo-accent text-lg">${parseFloat(selectedSaleDetail.total_amount).toLocaleString('es-CL')}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}

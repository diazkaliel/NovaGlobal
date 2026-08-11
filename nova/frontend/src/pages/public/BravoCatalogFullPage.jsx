import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ShoppingBag, MessageSquare, Sparkles, Search, Filter } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getPublicProducts } from '../../api/public'
import api from '../../api/client'

/**
 * BravoCatalogFullPage — Página pública completa de catálogo de productos Bravo.
 * Accesible desde el botón "Ver Todo el Catálogo" de BravoPublicPage.
 * Muestra todos los productos disponibles con filtros, búsqueda y paginación.
 */
export default function BravoCatalogFullPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [page, setPage] = useState(1)
  const perPage = 12

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getPublicProducts()
      setProducts(res.data)
      setFiltered(res.data)
    } catch {
      setError('No se pudo cargar el catálogo.')
    } finally {
      setLoading(false)
    }
  }

  // Filtrar y buscar
  useEffect(() => {
    let result = [...products]
    if (category !== 'all') {
      result = result.filter(p => (p.category || '').toLowerCase() === category)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q))
    }
    setFiltered(result)
    setPage(1)
  }, [search, category, products])

  const categories = ['all', ...new Set(products.map(p => (p.category || 'otro').toLowerCase()))]
  const totalPages = Math.ceil(filtered.length / perPage)
  const currentProducts = filtered.slice((page - 1) * perPage, page * perPage)

  const handleWhatsAppOrder = (product) => {
    const message = encodeURIComponent(`¡Hola! Estoy interesado en "${product.name}" ($${parseFloat(product.sale_price).toLocaleString('es-CL')}) de su catálogo Bravo. ¿Tienen disponibilidad?`)
    window.open(`https://wa.me/56967547300?text=${message}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-bravo-bg text-bravo-text font-sora">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-bravo-sidebar/90 backdrop-blur-lg border-b border-bravo-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-bravo-text-muted hover:text-bravo-accent transition-colors text-sm group cursor-pointer"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              Volver
            </button>
            <div className="h-6 w-px bg-bravo-border/30" />
            <div className="flex items-center gap-2">
              <img src="/logo-bravo.jpg" alt="Bravo" className="w-7 h-7 rounded-full border border-bravo-accent/40" />
              <span className="font-black text-white tracking-widest uppercase text-sm">Catálogo</span>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-xs w-full hidden sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bravo-text-muted" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full bg-bravo-input border border-bravo-border/30 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-bravo-accent/50 outline-none transition-colors"
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Mobile search */}
        <div className="sm:hidden mb-6 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bravo-text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full bg-bravo-input border border-bravo-border/30 rounded-xl pl-9 pr-3 py-3 text-sm text-white focus:border-bravo-accent/50 outline-none"
          />
        </div>

        {/* Title + Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <span className="text-[10px] text-bravo-accent tracking-widest font-mono font-bold uppercase block mb-1">Catálogo Completo</span>
            <h1 className="text-2xl md:text-4xl font-black italic tracking-tighter text-white uppercase">
              Productos Bravo
            </h1>
            <p className="text-bravo-text-muted text-xs mt-1">{filtered.length} productos disponibles</p>
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={14} className="text-bravo-text-muted shrink-0" />
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  category === cat
                    ? 'bg-bravo-accent/15 text-bravo-accent border border-bravo-accent/30'
                    : 'bg-white/5 text-bravo-text-muted hover:text-white border border-transparent'
                }`}
              >
                {cat === 'all' ? 'Todos' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <span className="w-8 h-8 border-2 border-bravo-accent/30 border-t-bravo-accent rounded-full animate-spin" />
            <span className="text-xs font-mono text-bravo-text-muted tracking-widest uppercase">Cargando catálogo...</span>
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-sm text-center">{error}</div>
        ) : currentProducts.length === 0 ? (
          <div className="p-16 border border-dashed border-bravo-border/30 rounded-2xl text-center flex flex-col items-center gap-4">
            <ShoppingBag size={40} className="text-bravo-text-muted/20" />
            <p className="text-bravo-text-muted text-sm">No se encontraron productos.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {currentProducts.map((product, idx) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (idx % 4) * 0.08, duration: 0.4 }}
                  className="shine-card bg-bravo-card border border-bravo-border/40 rounded-2xl overflow-hidden hover:border-bravo-accent/40 transition-all flex flex-col group"
                >
                  <div className="relative h-48 bg-stone-900/40 flex items-center justify-center p-4">
                    {product.image_url ? (
                      <img
                        src={product.image_url.startsWith('http') ? product.image_url : `${api.defaults.baseURL}${product.image_url}`}
                        alt={product.name}
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <ShoppingBag size={36} className="text-stone-700" />
                    )}
                    {product.stock > 0 ? (
                      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[8px] font-bold uppercase tracking-widest rounded-md backdrop-blur-md">
                        Disponible
                      </div>
                    ) : (
                      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[8px] font-bold uppercase tracking-widest rounded-md backdrop-blur-md">
                        Agotado
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex-grow flex flex-col">
                    <h3 className="font-bold text-xs text-white uppercase tracking-wider mb-1 line-clamp-2">{product.name}</h3>
                    {product.category && (
                      <span className="text-[9px] text-bravo-text-muted font-mono uppercase tracking-widest mb-2">{product.category}</span>
                    )}

                    <div className="mt-auto pt-3">
                      <span className="text-[9px] text-bravo-text-muted font-mono uppercase block">Valor Base</span>
                      <span className="text-base font-black text-bravo-accent">${parseFloat(product.sale_price).toLocaleString('es-CL')}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/5">
                      <button
                        onClick={() => handleWhatsAppOrder(product)}
                        className="flex items-center justify-center gap-1 py-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        <MessageSquare size={11} /> Consultar
                      </button>
                      <button
                        onClick={() => navigate(`/bravo-public#quote`)}
                        className="flex items-center justify-center gap-1 py-2 bg-bravo-accent/10 hover:bg-bravo-accent text-bravo-accent hover:text-white rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        <Sparkles size={11} /> Personalizar
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    className={`w-9 h-9 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      page === p
                        ? 'bg-bravo-accent text-white shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                        : 'bg-white/5 text-bravo-text-muted hover:bg-white/10'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-bravo-border/20 py-6 text-center text-[10px] text-stone-500 font-mono">
        © {new Date().getFullYear()} Bravo Personalizaciones · Powered by Nova Global
      </footer>
    </div>
  )
}

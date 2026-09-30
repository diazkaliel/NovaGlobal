import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ShoppingBag, MessageSquare, Sparkles, Search, Filter, Box } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getPublicProducts } from '../../api/public'
import api from '../../api/client'
import { mergeCatalogWithBackend, BRAVO_CATEGORIES } from '../../utils/bravoCatalogData'

const MONOPO_EASE = [0.19, 1, 0.22, 1]

/**
 * BravoCatalogFullPage — Galería Completa de Soportes de Autor
 * 
 * Implementada con la disciplina del sistema Monopo Saigon:
 * - Geometría binaria: 0px estricto en tarjetas, imágenes e inputs / 75px en píldoras y tags.
 * - Tipografía Roobert/Inter con contrastes editoriales y jerarquía limpia.
 * - Logotipo oficial de Bravo integrado en la navegación superior y pie de página.
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
      const merged = mergeCatalogWithBackend(res.data || [])
      setProducts(merged)
      setFiltered(merged)
    } catch {
      const fallback = mergeCatalogWithBackend([])
      setProducts(fallback)
      setFiltered(fallback)
    } finally {
      setLoading(false)
    }
  }

  // Filtrado y búsqueda en tiempo real
  useEffect(() => {
    let result = [...products]
    if (category !== 'all') {
      result = result.filter(p => {
        const cat = (p.category || '').toLowerCase()
        if (category === 'ceramica') return cat === 'ceramica' || cat === 'vidrio'
        return cat === category
      })
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p => (p.name || '').toLowerCase().includes(q) || (p.spec || '').toLowerCase().includes(q))
    }
    setFiltered(result)
    setPage(1)
  }, [search, category, products])

  const categories = BRAVO_CATEGORIES
  const totalPages = Math.ceil(filtered.length / perPage)
  const currentProducts = filtered.slice((page - 1) * perPage, page * perPage)

  const handleWhatsAppOrder = (product) => {
    const message = encodeURIComponent(
      `Hola Personalizaciones Bravo, deseo consultar disponibilidad y cotizar el soporte: "${product.name}" ($${parseFloat(product.sale_price).toLocaleString('es-CL')}).`
    )
    window.open(`https://wa.me/56967547300?text=${message}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-obsidian text-paper font-roobert antialiased selection:bg-paper selection:text-obsidian flex flex-col justify-between relative overflow-hidden">
      
      {/* Sello editorial fijo — identidad de taller */}
      <div className="fixed top-24 right-8 w-12 h-12 pointer-events-none select-none opacity-[0.10] z-0">
        <img src="/logo-bravo.jpg" alt="" aria-hidden="true" className="w-full h-full object-cover rounded-full" />
      </div>

      {/* ─── HEADER MONOPO SAIGON (Fixed 66px, Hairline Border, Logotipo Oficial) ─── */}
      <header className="sticky top-0 z-50 h-[66px] bg-obsidian/90 backdrop-blur-md border-b border-white/10 px-6 sm:px-12 flex items-center justify-between">
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-ash-mist hover:text-white transition-colors text-xs tracking-widest uppercase cursor-pointer focus-visible:outline-none"
          >
            <ArrowLeft size={14} />
            <span>Volver al Inicio</span>
          </button>

          <span className="w-px h-5 bg-white/15 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full overflow-hidden border border-amber-500/35 shrink-0 bg-black shadow-[0_0_10px_rgba(255,172,46,0.15)]">
              <img src="/logo-bravo.jpg" alt="Personalizaciones Bravo" className="w-full h-full object-cover" />
            </div>
            <span className="text-[12px] tracking-[0.2em] font-medium uppercase text-white hidden md:inline-block">
              Personalizaciones Bravo · Catálogo Oficial
            </span>
          </div>
        </div>

        {/* Buscador de Escritorio (0px Radius, Hairline Border) */}
        <div className="relative max-w-xs w-full hidden sm:block">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-felt-gray" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar prenda o soporte..."
            className="w-full bg-[#09090b] border border-white/20 pl-9 pr-4 py-2 text-xs text-white placeholder-felt-gray focus:outline-none focus:border-white transition-colors"
          />
        </div>
      </header>

      {/* ─── CONTENIDO PRINCIPAL ─── */}
      <main className="max-w-[1078px] mx-auto px-6 py-12 w-full flex-grow">
        
        {/* Buscador Móvil */}
        <div className="sm:hidden mb-8 relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-felt-gray" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar prenda o soporte..."
            className="w-full bg-[#09090b] border border-white/20 pl-9 pr-4 py-2.5 text-xs text-white placeholder-felt-gray focus:outline-none focus:border-white"
          />
        </div>

        {/* Encabezado Editorial de Sección & Filtros */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 border-b border-white/10 pb-8">
          <div className="space-y-2 text-left">
            <span className="text-[11px] uppercase tracking-[0.25em] text-ash-mist block">
              Catálogo de Soportes Físicos
            </span>
            <h1 className="text-3xl md:text-5xl font-light tracking-[-0.02em] text-white uppercase balance-text">
              Inventario de Producción.
            </h1>
            <p className="text-xs text-felt-gray font-normal">
              {filtered.length} soportes disponibles para estampado DTF, sublimación óptica y grabado láser.
            </p>
          </div>

          {/* Filtros de Categoría con Píldoras de 75px Radius */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={13} className="text-felt-gray mr-1 shrink-0" />
            {categories.map(cat => (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`px-4 py-1.5 rounded-[75px] text-[10px] uppercase tracking-[0.16em] font-normal transition-all duration-500 cursor-pointer focus-visible:outline-none ${
                  category === cat.key
                    ? 'bg-white text-black border border-white font-medium'
                    : 'bg-transparent text-ash-mist hover:text-white border border-white/20'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Productos con Contraste Radical Monopo (0px Radius, Sin sombras artificiales) */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-3">
            <span className="w-8 h-8 border border-white/20 border-t-white rounded-full animate-spin" />
            <span className="text-xs tracking-[0.2em] text-ash-mist uppercase font-light">
              Consultando inventario de taller...
            </span>
          </div>
        ) : error ? (
          <div className="p-8 border border-rose-500/40 text-rose-400 text-xs font-mono text-center">
            {error}
          </div>
        ) : currentProducts.length === 0 ? (
          <div className="p-20 border border-white/10 text-center flex flex-col items-center gap-4">
            <ShoppingBag size={40} className="text-felt-gray/40" />
            <p className="text-ash-mist text-xs uppercase tracking-widest">
              No se encontraron soportes en esta categoría.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 text-left">
              {currentProducts.map((product, idx) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (idx % 6) * 0.05, duration: 0.6, ease: MONOPO_EASE }}
                  className="group flex flex-col justify-between border-b border-white/10 pb-6 transition-all"
                >
                  {/* Contenedor de Imagen a Corte Neto (0px Radius) */}
                  <div className="w-full h-72 bg-[#09090b] border border-white/10 flex items-center justify-center p-6 relative overflow-hidden">
                    <img
                      src={
                        product.image_url
                          ? (product.image_url.startsWith('http') ? product.image_url : `${api.defaults.baseURL}${product.image_url}`)
                          : '/mockups/polera_front.png'
                      }
                      alt={product.name}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-700 ease-monopo"
                      onError={(e) => { e.target.src = '/mockups/polera_front.png' }}
                    />

                    {/* Tag de Disponibilidad con Píldora de 75px */}
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-[75px] bg-black/80 border border-white/20 text-[9px] uppercase tracking-widest text-ash-mist">
                      {product.stock > 0 ? 'En Taller' : 'A Pedido'}
                    </div>
                  </div>

                  {/* Ficha Editorial */}
                  <div className="pt-5 space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-felt-gray">
                        {product.category || 'Soporte Especial'}
                      </span>
                      <span className="text-base font-light tracking-tight text-white">
                        ${Number(product.sale_price).toLocaleString('es-CL')}
                      </span>
                    </div>

                    <h3 className="text-base font-normal text-white tracking-tight leading-snug line-clamp-2">
                      {product.name}
                    </h3>
                  </div>

                  {/* Botones de Acción (Ghost Pill 75px Radius) */}
                  <div className="grid grid-cols-2 gap-2 pt-4">
                    <button
                      onClick={() => handleWhatsAppOrder(product)}
                      className="rounded-[75px] border border-white/30 hover:border-white text-white py-2.5 text-[10px] tracking-[0.14em] uppercase font-normal transition-all duration-500 cursor-pointer bg-transparent text-center focus-visible:outline-none flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare size={11} />
                      <span>Cotizar</span>
                    </button>

                    <button
                      onClick={() => navigate(`/?product=${product.typeKey || 'Polera'}#studio`)}
                      className="rounded-[75px] bg-slate-pill hover:bg-white hover:text-black border border-white/30 text-white py-2.5 text-[10px] tracking-[0.14em] uppercase font-normal transition-all duration-500 cursor-pointer text-center focus-visible:outline-none flex items-center justify-center gap-1.5"
                    >
                      <Box size={11} />
                      <span>3D Studio</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Paginación Editorial */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-16 pt-8 border-t border-white/10">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    className={`w-9 h-9 rounded-[75px] text-xs font-normal transition-colors cursor-pointer focus-visible:outline-none ${
                      page === p
                        ? 'bg-white text-black font-semibold'
                        : 'bg-transparent text-ash-mist border border-white/20 hover:border-white'
                    }`}
                  >
                    0{p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* ─── FOOTER EDITORIAL CON LOGOTIPO ─── */}
      <footer className="py-12 bg-obsidian border-t border-white/10 text-left text-[11px] text-felt-gray font-normal">
        <div className="max-w-[1078px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-amber-500/40 shrink-0 bg-black shadow-[0_0_15px_rgba(255,172,46,0.18)]">
              <img src="/logo-bravo.jpg" alt="Personalizaciones Bravo" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-white uppercase tracking-[0.2em] block font-medium text-xs leading-tight">
                Personalizaciones Bravo
              </span>
              <span className="text-[10px] text-amber-200/70 uppercase tracking-widest block leading-tight mt-0.5">
                Catálogo Oficial de Taller · Quillota, Región de Valparaíso
              </span>
            </div>
          </div>

          <p className="text-felt-gray text-[10px] font-mono">
            © {new Date().getFullYear()} Personalizaciones Bravo. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}

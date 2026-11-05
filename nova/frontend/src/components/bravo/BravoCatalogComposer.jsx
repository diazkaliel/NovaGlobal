import { useEffect, useRef, useState } from 'react'
import { Plus, Search, Trash2, Package, LoaderCircle } from 'lucide-react'
import { getBravoCatalog } from '../../api/bravo'

const CLP = new Intl.NumberFormat('es-CL', {
  style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
})
const PAGE_SIZE = 20

// El precio en pantalla es informativo; la API Bravo calcula el total autorizado.
export function totalCatalogCents(orderLines) {
  return orderLines.reduce((sum, line) =>
    sum + Math.round(Number(line.unit_price) * 100) * Number(line.quantity || 0), 0)
}

function CatalogResult({ product, onAdd }) {
  return (
    <li className="border-b border-bravo-border last:border-0">
      <button type="button" onClick={() => onAdd(product)}
        className="w-full px-3 py-3 text-left flex items-center gap-3 hover:bg-[#eee5d7] group">
        <div className="w-11 h-11 border border-bravo-border bg-[#e8e1d6] shrink-0 overflow-hidden grid place-items-center">
          {product.image_url
            ? <img src={product.image_url} alt="" loading="lazy" className="w-full h-full object-cover"/>
            : <Package size={18} className="text-bravo-text-muted"/>}
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-bravo-text truncate">{product.name}</span>
          <span className="text-xs text-bravo-text-muted">
            {product.stock > 0 ? `Stock informado: ${product.stock}` : 'Disponible a pedido'}
          </span>
        </div>
        <div className="text-right shrink-0">
          <strong className="block text-sm text-bravo-text">{CLP.format(Number(product.sale_price))}</strong>
          <span className="text-[11px] text-bravo-accent font-semibold inline-flex items-center gap-1">
            <Plus size={12}/> Agregar
          </span>
        </div>
      </button>
    </li>
  )
}

export default function BravoCatalogComposer({ orderLines, onChange, disabled = false }) {
  const lineSequence = useRef(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState([])
  const [page, setPage] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')

  useEffect(() => {
    const abortController = new AbortController()
    const searchTimer = setTimeout(async () => {
      setLoading(true)
      setCatalogError('')
      try {
        const response = await getBravoCatalog({
          search: searchTerm.trim() || undefined,
          skip: page * PAGE_SIZE,
          limit: PAGE_SIZE,
        }, abortController.signal)
        if (abortController.signal.aborted) return
        setProducts(currentProducts => page === 0
          ? response.data
          : [...currentProducts, ...response.data])
        setHasNextPage(response.data.length === PAGE_SIZE)
      } catch {
        if (!abortController.signal.aborted) setCatalogError('No se pudo cargar el catálogo.')
      } finally {
        if (!abortController.signal.aborted) setLoading(false)
      }
    }, page === 0 ? 250 : 0)

    return () => {
      clearTimeout(searchTimer)
      abortController.abort()
    }
  }, [searchTerm, page])

  const addProduct = (product) => {
    if (disabled) return
    lineSequence.current += 1
    onChange([...orderLines, {
      local_id: lineSequence.current,
      catalog_product_id: product.id,
      product_name: product.name,
      variant: '',
      quantity: 1,
      unit_price: product.sale_price,
      stock: product.stock,
    }])
  }

  const updateLine = (lineId, changes) => {
    onChange(orderLines.map(line =>
      line.local_id === lineId ? { ...line, ...changes } : line))
  }

  const removeLine = (lineId) => onChange(orderLines.filter(line => line.local_id !== lineId))
  const total = totalCatalogCents(orderLines) / 100
  const quantity = orderLines.reduce((sum, line) => sum + Number(line.quantity || 0), 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-5">
      <section className="min-w-0 border border-bravo-border bg-bravo-input">
        <div className="p-4 border-b border-bravo-border">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="font-bold text-sm">01 / Catálogo disponible</h3>
            <span className="text-[10px] uppercase tracking-widest text-bravo-text-muted">Bravo</span>
          </div>
          <label htmlFor="bravo-product-search" className="sr-only">Buscar producto</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-bravo-text-muted"/>
            <input
              id="bravo-product-search"
              type="search"
              value={searchTerm}
              onChange={event => {
                setSearchTerm(event.target.value)
                setPage(0)
              }}
              placeholder="Poleras, tazones, botellas..."
              className="w-full bg-white border border-bravo-border pl-10 pr-3 py-2.5 text-sm text-bravo-text"
            />
          </div>
        </div>
        {catalogError && <p role="alert" className="text-xs p-3 text-red-700">{catalogError}</p>}
        <ul className="min-h-20 max-h-[360px] overflow-y-auto">
          {products.map(product => (
            <CatalogResult key={product.id} product={product} onAdd={addProduct}/>
          ))}
        </ul>
        {!loading && products.length === 0 && !catalogError && (
          <p className="text-xs text-bravo-text-muted p-4">
            No hay productos en esta búsqueda. Regístralos en Productos / Insumos.
          </p>
        )}
        <div className="border-t border-bravo-border px-3 py-2 min-h-[44px]">
          {loading ? (
            <span role="status" className="inline-flex items-center gap-2 text-xs text-bravo-text-muted">
              <LoaderCircle size={14} className="animate-spin"/> Cargando catálogo…
            </span>
          ) : hasNextPage ? (
            <button type="button" onClick={() => setPage(currentPage => currentPage + 1)}
              className="text-xs font-bold text-bravo-accent px-3 py-2">Mostrar más productos</button>
          ) : <span className="text-[11px] text-bravo-text-muted">Sólo se muestran productos de venta Bravo.</span>}
        </div>
      </section>

      <section className="min-w-0 border border-bravo-border bg-bravo-card">
        <div className="px-4 py-4 border-b border-bravo-border flex items-baseline justify-between gap-2">
          <h3 className="font-bold text-sm">02 / Artículos del pedido</h3>
          <span className="text-[11px] text-bravo-text-muted">{quantity} unidades</span>
        </div>
        {orderLines.length === 0 && (
          <div className="p-6 min-h-40 flex flex-col items-center justify-center text-center">
            <Package size={25} className="text-bravo-text-muted mb-2"/>
            <p className="text-sm font-semibold text-bravo-text">Tu orden todavía está vacía</p>
            <p className="text-xs text-bravo-text-muted mt-1 max-w-52">
              Elige un producto del catálogo. Puedes sumar varios y personalizar cada uno.
            </p>
          </div>
        )}
        <ol className="divide-y divide-bravo-border">
          {orderLines.map((line, index) => (
            <li key={line.local_id} className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-xs font-mono text-bravo-accent mt-0.5">{String(index + 1).padStart(2, '0')}</span>
                <div className="flex-1 min-w-0">
                  <strong className="block text-sm font-semibold leading-snug">{line.product_name}</strong>
                  <span className="text-[11px] text-bravo-text-muted">Unidad: {CLP.format(Number(line.unit_price))}</span>
                </div>
                <button type="button" disabled={disabled} onClick={() => removeLine(line.local_id)}
                  title="Quitar producto" aria-label={`Quitar ${line.product_name}`}
                  className="border border-bravo-border p-2.5 text-bravo-text-muted hover:text-red-700 disabled:opacity-40">
                  <Trash2 size={15}/>
                </button>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-3">
                <div className="min-w-0">
                  <label htmlFor={`bravo-variant-${line.local_id}`}
                    className="text-[10px] font-bold uppercase tracking-wider text-bravo-text-muted block mb-1">
                    Talla / color / variante
                  </label>
                  <input id={`bravo-variant-${line.local_id}`} maxLength={120}
                    disabled={disabled}
                    value={line.variant}
                    placeholder="M, negra, logo frontal..."
                    onChange={event => updateLine(line.local_id, { variant: event.target.value })}
                    className="w-full min-w-0 border border-bravo-border bg-bravo-input px-3 py-2 text-sm"/>
                </div>
                <div>
                  <label htmlFor={`bravo-qty-${line.local_id}`}
                    className="text-[10px] font-bold uppercase tracking-wider text-bravo-text-muted block mb-1">
                    Cantidad
                  </label>
                  <input id={`bravo-qty-${line.local_id}`} type="number" min="1" max="999" step="1"
                    value={line.quantity} disabled={disabled}
                    onChange={event => updateLine(line.local_id, { quantity: event.target.value })}
                    className="w-full border border-bravo-border bg-bravo-input px-2 py-2 text-sm text-center"/>
                </div>
              </div>
              <p className="text-right text-sm font-semibold tabular-nums">
                {CLP.format(Number(line.unit_price) * Number(line.quantity || 0))}
              </p>
            </li>
          ))}
        </ol>
        <div className="border-t border-bravo-border p-4 bg-[#e9e2d5] flex items-end justify-between gap-2">
          <div>
            <span className="block text-[10px] uppercase tracking-widest text-bravo-text-muted">Subtotal del catálogo</span>
            <span className="block text-[11px] text-bravo-text-muted mt-1">Precios confirmados al guardar</span>
          </div>
          <strong className="text-xl font-semibold tabular-nums whitespace-nowrap text-bravo-text">
            {CLP.format(total)}
          </strong>
        </div>
      </section>
    </div>
  )
}

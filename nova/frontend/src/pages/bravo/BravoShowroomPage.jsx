import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Minus, Plus, Search, Package, ShoppingBag, X } from 'lucide-react'
import { getBravoCatalog } from '../../api/bravo'
import './BravoShowroomPage.css'

const PAGE_SIZE = 24
const CLP = new Intl.NumberFormat('es-CL', {
  style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
})

function CatalogCard({ product, position, onSelect }) {
  return (
    <article className="bravo-showroom-product" style={{ '--position': position }}>
      <div className="bravo-showroom-image">
        {product.image_url
          ? <img src={product.image_url} alt={product.name} loading="lazy"/>
          : <div className="bravo-showroom-image-empty" aria-hidden="true">
              <Package size={36}/><span>BRAVO</span>
            </div>}
        <span className="bravo-showroom-stock">
          {product.stock > 0 ? 'Inventario disponible' : 'Consultar disponibilidad'}
        </span>
      </div>
      <div className="bravo-showroom-product-body">
        <div>
          <span className="bravo-showroom-index">{String(position + 1).padStart(2, '0')} / CATÁLOGO</span>
          <h3>{product.name}</h3>
          <p>{CLP.format(Number(product.sale_price))} <small>precio base</small></p>
        </div>
        <button type="button" onClick={() => onSelect(product)}
          aria-label={`Seleccionar ${product.name}`} title={`Añadir ${product.name} a la orden`}>
          <Plus size={20}/>
        </button>
      </div>
    </article>
  )
}

export default function BravoShowroomPage() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(0)
  const [catalogProducts, setCatalogProducts] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState([])

  useEffect(() => {
    const controller = new AbortController()
    const debounce = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const response = await getBravoCatalog({
          search: searchTerm.trim() || undefined,
          skip: page * PAGE_SIZE,
          limit: PAGE_SIZE,
        }, controller.signal)
        if (controller.signal.aborted) return
        const received = response.data
        setCatalogProducts(previous => page === 0 ? received : [...previous, ...received])
        setHasMore(received.length === PAGE_SIZE)
      } catch {
        if (!controller.signal.aborted) setError('No se pudo consultar el catálogo. Revisa la conexión.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, page === 0 ? 220 : 0)
    return () => { clearTimeout(debounce); controller.abort() }
  }, [page, searchTerm])

  const selectProduct = (product) => {
    setDraft(previous => {
      const selected = previous.find(line => line.catalog_product_id === product.id)
      if (selected) return previous.map(line =>
        line.catalog_product_id === product.id
          ? { ...line, quantity: Math.min(999, line.quantity + 1) }
          : line
      )
      return [...previous, {
        catalog_product_id: product.id,
        product_name: product.name,
        unit_price: product.sale_price,
        stock: product.stock,
        variant: '',
        quantity: 1,
      }]
    })
  }

  const changeQuantity = (productId, difference) => {
    setDraft(previous => previous
      .map(line => line.catalog_product_id === productId
        ? { ...line, quantity: line.quantity + difference } : line)
      .filter(line => line.quantity > 0))
  }

  const goToOrder = () => {
    if (draft.length === 0) return
    // La navegación lleva sólo un borrador. La API comprobará productos y precios al confirmar.
    navigate('/bravo/orders/new', { state: { bravoDraft: draft } })
  }

  const selectedUnits = draft.reduce((total, line) => total + line.quantity, 0)
  const indicativeTotal = draft.reduce((total, line) =>
    total + Number(line.unit_price) * line.quantity, 0)

  return (
    <div className="bravo-showroom">
      <div className="bravo-showroom-meta">
        <span>BRAVO / ESTUDIO DE PERSONALIZACIÓN</span>
        <span className="bravo-showroom-private">VISTA INTERNA · CATÁLOGO REAL</span>
      </div>

      <header className="bravo-showroom-hero">
        <span className="bravo-showroom-overline">UN MISMO TALLER. MÚLTIPLES POSIBILIDADES.</span>
        <h1>Hazlo <em>tuyo.</em></h1>
        <p>Productos del inventario de BRAVO, preparados para convertirse en una orden de personalización. Elige tus piezas y define los detalles en el siguiente paso.</p>
        <div className="bravo-showroom-hero-bottom">
          <a href="#catalogo-bravo">Explorar piezas <ArrowRight size={16}/></a>
          <span>EDICIÓN DE TALLER / {new Date().getFullYear()}</span>
        </div>
        <div className="bravo-showroom-watermark" aria-hidden="true">B.</div>
      </header>

      <div className="bravo-showroom-ticker" aria-hidden="true">
        <div>ESTAMPA / CREA / PRODUCE / PERSONALIZA / ESTAMPA / CREA / PRODUCE / PERSONALIZA /</div>
      </div>

      <div className="bravo-showroom-section-heading" id="catalogo-bravo">
        <div>
          <span>01 / SELECCIÓN DE PRODUCTOS</span>
          <h2>Materia prima para crear.</h2>
        </div>
        <label className="bravo-showroom-search">
          <Search size={18}/>
          <span className="sr-only">Buscar en el catálogo</span>
          <input value={searchTerm} type="search"
            onChange={event => { setSearchTerm(event.target.value); setPage(0) }}
            placeholder="Buscar productos"/>
        </label>
      </div>

      {error && <p className="bravo-showroom-error" role="alert">{error}</p>}
      <div className="bravo-showroom-grid" aria-busy={loading}>
        {catalogProducts.map((product, index) =>
          <CatalogCard key={product.id} product={product} position={index} onSelect={selectProduct}/>
        )}
      </div>
      {loading && <p className="bravo-showroom-state" role="status">Consultando productos de BRAVO…</p>}
      {!loading && catalogProducts.length === 0 && !error && (
        <p className="bravo-showroom-state">No hay productos de venta en esta búsqueda.</p>
      )}
      {!loading && hasMore && (
        <button type="button" className="bravo-showroom-more" onClick={() => setPage(value => value + 1)}>
          Ver más productos <Plus size={16}/>
        </button>
      )}

      <section className="bravo-showroom-draft" aria-label="Selección para la nueva orden">
        <div className="bravo-showroom-draft-heading">
          <div>
            <span>02 / TU SELECCIÓN</span>
            <h2>De la idea a la orden.</h2>
          </div>
          <span className="bravo-showroom-count"><ShoppingBag size={17}/>{selectedUnits} unidades</span>
        </div>
        {draft.length === 0 ? (
          <p className="bravo-showroom-empty">Selecciona un producto para comenzar una nueva orden.</p>
        ) : (
          <div className="bravo-showroom-draft-list">
            {draft.map(line => (
              <div className="bravo-showroom-draft-line" key={line.catalog_product_id}>
                <div><strong>{line.product_name}</strong><span>{CLP.format(Number(line.unit_price))} / unidad</span></div>
                <div className="bravo-showroom-qty">
                  <button type="button" aria-label={`Quitar una unidad de ${line.product_name}`}
                    onClick={() => changeQuantity(line.catalog_product_id, -1)}><Minus size={14}/></button>
                  <span>{line.quantity}</span>
                  <button type="button" disabled={line.quantity >= 999}
                    aria-label={`Agregar una unidad de ${line.product_name}`}
                    onClick={() => changeQuantity(line.catalog_product_id, 1)}><Plus size={14}/></button>
                  <button type="button" aria-label={`Eliminar ${line.product_name}`}
                    onClick={() => setDraft(previous => previous.filter(selected => selected.catalog_product_id !== line.catalog_product_id))}><X size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        )}
        <footer className="bravo-showroom-footer">
          <div><span>Total orientativo</span><strong>{CLP.format(indicativeTotal)}</strong>
            <small>No reserva stock. Los precios se verifican en el servidor antes de guardar.</small></div>
          <button type="button" disabled={draft.length === 0} onClick={goToOrder}>
            Continuar en Nueva orden <ArrowRight size={18}/>
          </button>
        </footer>
      </section>
    </div>
  )
}

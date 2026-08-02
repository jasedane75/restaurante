import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api'
import useAuthStore from '../store/authStore'
import formatMoney from '../utils/formatMoney'

const METODOS_PAGO = ['efectivo', 'tarjeta', 'transferencia', 'otro']

export default function Pedido() {
  const { pedidoId, mesaId } = useParams()
  const navigate = useNavigate()
  const { usuario } = useAuthStore()
  const esCajero = ['dueno', 'cajero'].includes(usuario?.rol)

  const [pedido, setPedido] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [catActiva, setCatActiva] = useState(null)
  const [carrito, setCarrito] = useState([])
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [descuento, setDescuento] = useState(0)
  const [loading, setLoading] = useState(false)
  const [editando, setEditando] = useState(false) // modo edición en pedido existente

  // Delivery
  const esDelivery = mesaId === '0'
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTel, setClienteTel] = useState('')
  const [direccion, setDireccion] = useState('')

  // Comensales (mesa)
  const [comensales, setComensales] = useState('')

  useEffect(() => {
    api.get('/productos/categorias').then(({ data }) => {
      setCategorias(data)
      if (data.length) setCatActiva(data[0].id)
    })
    api.get('/productos/?disponible=true').then(({ data }) => setProductos(data))
    if (pedidoId) {
      api.get(`/pedidos/${pedidoId}`).then(({ data }) => setPedido(data))
    }
  }, [pedidoId])

  const productosFiltrados = productos.filter((p) => p.categoria_id === catActiva)
  const pedidoEditable = pedido && !['cerrado', 'cancelado'].includes(pedido.estado)

  // ── Carrito (pedido nuevo o agregar a existente) ──────────
  const agregarAlCarrito = (producto) => {
    setCarrito((prev) => {
      const existe = prev.find((i) => i.producto_id === producto.id)
      if (existe) return prev.map((i) => i.producto_id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i)
      return [...prev, { producto_id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1, notas: '' }]
    })
  }

  const cambiarCantidad = (producto_id, delta) => {
    setCarrito((prev) =>
      prev.map((i) => i.producto_id === producto_id ? { ...i, cantidad: Math.max(1, i.cantidad + delta) } : i)
        .filter((i) => i.cantidad > 0)
    )
  }

  const subtotalCarrito = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0)

  // ── Crear pedido nuevo ────────────────────────────────────
  const crearPedido = async () => {
    if (!carrito.length) return toast.error('Agrega al menos un producto')
    setLoading(true)
    try {
      const payload = {
        tipo: esDelivery ? 'delivery' : 'mesa',
        mesa_id: esDelivery ? null : Number(mesaId),
        comensales: esDelivery ? null : (comensales ? Number(comensales) : null),
        cliente_nombre: esDelivery ? clienteNombre : null,
        cliente_telefono: esDelivery ? clienteTel : null,
        direccion_entrega: esDelivery ? direccion : null,
        items: carrito.map(({ producto_id, cantidad, notas }) => ({ producto_id, cantidad, notas })),
      }
      const { data } = await api.post('/pedidos/', payload)
      toast.success('Pedido creado')
      navigate(`/pedido/${data.id}`)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al crear pedido')
    } finally {
      setLoading(false)
    }
  }

  // ── Agregar items a pedido existente ──────────────────────
  const agregarItemsAPedido = async () => {
    if (!carrito.length) return
    setLoading(true)
    try {
      const items = carrito.map(({ producto_id, cantidad, notas }) => ({ producto_id, cantidad, notas }))
      const { data } = await api.post(`/pedidos/${pedidoId}/items`, items)
      setPedido(data)
      setCarrito([])
      setEditando(false)
      toast.success('Items agregados')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al agregar items')
    } finally {
      setLoading(false)
    }
  }

  // ── Eliminar item de pedido existente ─────────────────────
  const eliminarItem = async (itemId) => {
    try {
      const { data } = await api.delete(`/pedidos/${pedidoId}/items/${itemId}`)
      setPedido(data)
      toast.success('Item eliminado')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al eliminar')
    }
  }

  // ── Cancelar pedido ─────────────────────────────────────
  const cancelarPedido = async () => {
    if (!confirm('¿Cancelar este pedido? La mesa quedará libre.')) return
    setLoading(true)
    try {
      await api.delete(`/pedidos/${pedidoId}`)
      toast.success('Pedido cancelado')
      navigate('/')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al cancelar')
    } finally {
      setLoading(false)
    }
  }

  // ── Cambiar estado ────────────────────────────────────────
  const cambiarEstado = async (estado) => {
    const { data } = await api.patch(`/pedidos/${pedidoId}/estado`, { estado })
    setPedido(data)
    toast.success(`Estado: ${estado}`)
  }

  // ── Cerrar pedido / cobrar ────────────────────────────────
  const cerrarPedido = async () => {
    setLoading(true)
    try {
      await api.post(`/pedidos/${pedidoId}/cerrar`, { metodo_pago: metodoPago, descuento: Number(descuento) })
      toast.success('Pedido cerrado y venta registrada')
      navigate('/')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al cerrar')
    } finally {
      setLoading(false)
    }
  }

  const totalPedido = pedido ? pedido.subtotal - descuento : 0

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Panel izquierdo: menú */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <button onClick={() => navigate('/')} className="btn-secondary text-sm">← Volver</button>
          <h1 className="text-xl font-bold">
            {pedidoId ? `Pedido #${pedidoId}` : esDelivery ? 'Nuevo Delivery' : `Nueva Orden — Mesa ${mesaId}`}
          </h1>
          {pedido && (
            <span className="badge bg-gray-200 text-gray-700">{pedido.estado}</span>
          )}
          {pedidoEditable && !editando && (
            <button onClick={() => setEditando(true)} className="btn-secondary text-xs py-1 px-2">
              ✏️ Agregar items
            </button>
          )}
          {editando && (
            <button onClick={() => { setEditando(false); setCarrito([]) }} className="btn-secondary text-xs py-1 px-2">
              ✕ Cancelar edición
            </button>
          )}
        </div>

        {/* Datos delivery */}
        {esDelivery && !pedidoId && (
          <div className="card mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input className="input" placeholder="Nombre cliente" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} />
            <input className="input" placeholder="Teléfono" value={clienteTel} onChange={(e) => setClienteTel(e.target.value)} />
            <input className="input" placeholder="Dirección" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          </div>
        )}

        {/* Comensales (mesa) */}
        {!esDelivery && !pedidoId && (
          <div className="card mb-4 flex items-center gap-3">
            <label className="text-sm font-medium">👥 Personas en la mesa:</label>
            <input
              className="input w-20"
              type="number"
              min="1"
              placeholder="?"
              value={comensales}
              onChange={(e) => setComensales(e.target.value)}
            />
          </div>
        )}

        {/* Categorías y productos - pedido nuevo O modo edición */}
        {(!pedidoId || editando) && (
          <>
            <div className="flex gap-2 mb-3 flex-wrap">
              {categorias.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCatActiva(c.id)}
                  className={`btn text-sm ${catActiva === c.id ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {c.nombre}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-auto">
              {productosFiltrados.map((p) => (
                <button
                  key={p.id}
                  onClick={() => agregarAlCarrito(p)}
                  className="card text-left hover:border-brand-500 hover:border transition-colors"
                >
                  <p className="font-semibold text-sm">{p.nombre}</p>
                  <p className="text-brand-600 font-bold mt-1">{formatMoney(p.precio)}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Items de pedido existente */}
        {pedido && (
          <div className="card mt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Producto</th>
                  <th className="pb-2 text-center">Cant.</th>
                  <th className="pb-2 text-right">Subtotal</th>
                  {pedidoEditable && <th className="pb-2 w-8"></th>}
                </tr>
              </thead>
              <tbody>
                {pedido.items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2">{productos.find(p => p.id === item.producto_id)?.nombre || `#${item.producto_id}`}</td>
                    <td className="py-2 text-center">{item.cantidad}</td>
                    <td className="py-2 text-right">{formatMoney(item.subtotal)}</td>
                    {pedidoEditable && (
                      <td className="py-2 text-right">
                        <button onClick={() => eliminarItem(item.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Panel derecho: resumen / acciones */}
      <div className="w-full lg:w-72 flex flex-col gap-4">
        <div className="card flex-1">
          <h2 className="font-bold mb-3">{editando ? 'Nuevos items' : pedidoId ? 'Resumen' : 'Carrito'}</h2>

          {/* Carrito (nuevo o edición) */}
          {(!pedidoId || editando) && carrito.map((item) => (
            <div key={item.producto_id} className="flex items-center justify-between mb-2 text-sm">
              <span className="flex-1 truncate">{item.nombre}</span>
              <div className="flex items-center gap-1 mx-2">
                <button onClick={() => cambiarCantidad(item.producto_id, -1)} className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300">−</button>
                <span className="w-5 text-center">{item.cantidad}</span>
                <button onClick={() => cambiarCantidad(item.producto_id, 1)} className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300">+</button>
              </div>
              <span className="font-semibold">{formatMoney(item.precio * item.cantidad)}</span>
            </div>
          ))}

          {!editando && (
            <div className="border-t pt-3 mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatMoney(pedido?.subtotal ?? subtotalCarrito)}</span>
              </div>
              {esCajero && pedidoId && (
                <div className="flex justify-between items-center">
                  <span>Descuento</span>
                  <input
                    type="number" min="0"
                    className="input w-24 text-right py-1"
                    value={descuento}
                    onChange={(e) => setDescuento(e.target.value)}
                  />
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1">
                <span>Total</span>
                <span>{formatMoney(pedido ? totalPedido : subtotalCarrito)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="card space-y-3">
          {/* Crear pedido nuevo */}
          {!pedidoId && (
            <button onClick={crearPedido} disabled={loading || !carrito.length} className="btn-primary w-full">
              {loading ? 'Creando...' : 'Crear Pedido'}
            </button>
          )}

          {/* Agregar items en modo edición */}
          {editando && (
            <button onClick={agregarItemsAPedido} disabled={loading || !carrito.length} className="btn-primary w-full">
              {loading ? 'Agregando...' : `Agregar ${carrito.length} item(s)`}
            </button>
          )}

          {/* Acciones de pedido existente (no en modo edición) */}
          {pedido && !editando && pedido.estado !== 'cerrado' && pedido.estado !== 'cancelado' && (
            <>
              {pedido.estado === 'abierto' && (
                <button onClick={() => cambiarEstado('en_cocina')} className="btn-primary w-full">
                  🍳 Enviar a cocina
                </button>
              )}
              {pedido.estado === 'en_cocina' && (
                <button onClick={() => cambiarEstado('listo')} className="btn-primary w-full">
                  ✅ Marcar listo
                </button>
              )}
              {esCajero && (
                <>
                  <select
                    className="input"
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                  >
                    {METODOS_PAGO.map((m) => (
                      <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                    ))}
                  </select>
                  <button onClick={cerrarPedido} disabled={loading} className="btn-danger w-full">
                    {loading ? 'Procesando...' : '💳 Cobrar y cerrar'}
                  </button>
                </>
              )}
            </>
          )}

          {pedido?.estado === 'cerrado' && (
            <p className="text-center text-green-600 font-semibold">✅ Pedido cerrado</p>
          )}
          {pedido?.estado === 'cancelado' && (
            <p className="text-center text-red-600 font-semibold">❌ Pedido cancelado</p>
          )}
          {pedidoEditable && !editando && (
            <button onClick={cancelarPedido} disabled={loading} className="btn-secondary w-full text-red-600 border-red-300 hover:bg-red-50">
              🗑️ Cancelar pedido
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

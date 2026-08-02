import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api'
import formatMoney from '../utils/formatMoney'

const FORM_VACIO = { categoria_id: '', nombre: '', descripcion: '', precio: '', disponible: true, imagen_url: '' }

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [insumos, setInsumos] = useState([])
  const [form, setForm] = useState(FORM_VACIO)
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [recetaModal, setRecetaModal] = useState(null)   // producto seleccionado
  const [recetas, setRecetas] = useState([])
  const [nuevaReceta, setNuevaReceta] = useState({ insumo_id: '', cantidad: '' })

  const cargar = async () => {
    const [p, c, i] = await Promise.all([
      api.get('/productos/'),
      api.get('/productos/categorias'),
      api.get('/inventario/'),
    ])
    setProductos(p.data)
    setCategorias(c.data)
    setInsumos(i.data)
  }

  useEffect(() => { cargar() }, [])

  const abrirForm = (producto = null) => {
    setEditId(producto?.id || null)
    setForm(producto ? { ...producto, categoria_id: producto.categoria_id || '' } : FORM_VACIO)
    setShowForm(true)
  }

  const guardar = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...form, precio: Number(form.precio), categoria_id: form.categoria_id || null }
      if (editId) await api.put(`/productos/${editId}`, payload)
      else await api.post('/productos/', payload)
      toast.success(editId ? 'Producto actualizado' : 'Producto creado')
      setShowForm(false)
      cargar()
    } catch { toast.error('Error al guardar') }
  }

  const abrirRecetas = async (producto) => {
    setRecetaModal(producto)
    const { data } = await api.get(`/productos/${producto.id}/receta`)
    setRecetas(data)
  }

  const agregarReceta = async () => {
    if (!nuevaReceta.insumo_id || !nuevaReceta.cantidad) return
    try {
      await api.post(`/productos/${recetaModal.id}/receta`, {
        insumo_id: Number(nuevaReceta.insumo_id),
        cantidad: Number(nuevaReceta.cantidad),
      })
      toast.success('Insumo agregado a receta')
      setNuevaReceta({ insumo_id: '', cantidad: '' })
      const { data } = await api.get(`/productos/${recetaModal.id}/receta`)
      setRecetas(data)
    } catch { toast.error('Error') }
  }

  const eliminarReceta = async (insumo_id) => {
    await api.delete(`/productos/${recetaModal.id}/receta/${insumo_id}`)
    setRecetas((prev) => prev.filter((r) => r.insumo_id !== insumo_id))
    toast.success('Eliminado')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Productos</h1>
        <button onClick={() => abrirForm()} className="btn-primary">+ Nuevo producto</button>
      </div>

      {showForm && (
        <form onSubmit={guardar} className="card mb-6 grid grid-cols-2 gap-3">
          <input className="input" placeholder="Nombre" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <select className="input" value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}>
            <option value="">Sin categoría</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <input className="input" type="number" step="0.01" placeholder="Precio" required value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} />
          <input className="input" placeholder="URL imagen (opcional)" value={form.imagen_url || ''} onChange={(e) => setForm({ ...form, imagen_url: e.target.value })} />
          <textarea className="input col-span-2" placeholder="Descripción" rows={2} value={form.descripcion || ''} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.disponible} onChange={(e) => setForm({ ...form, disponible: e.target.checked })} />
            Disponible en menú
          </label>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">{editId ? 'Actualizar' : 'Crear'}</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {productos.map((p) => (
          <div key={p.id} className="card flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{p.nombre}</p>
                <p className="text-xs text-gray-400">{categorias.find((c) => c.id === p.categoria_id)?.nombre || 'Sin categoría'}</p>
              </div>
              <span className="font-bold text-brand-600">{formatMoney(p.precio)}</span>
            </div>
            {p.descripcion && <p className="text-xs text-gray-500">{p.descripcion}</p>}
            <div className="flex gap-2 mt-auto pt-2 border-t">
              <span className={`badge ${p.disponible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {p.disponible ? 'Disponible' : 'Oculto'}
              </span>
              <button onClick={() => abrirForm(p)} className="btn-secondary text-xs py-1 px-2 ml-auto">Editar</button>
              <button onClick={() => abrirRecetas(p)} className="btn-secondary text-xs py-1 px-2">🧾 Receta</button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal recetas */}
      {recetaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">Receta: {recetaModal.nombre}</h2>
              <button onClick={() => setRecetaModal(null)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>

            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-1">Insumo</th>
                  <th className="pb-1 text-right">Cantidad</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recetas.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-1">{insumos.find((i) => i.id === r.insumo_id)?.nombre || r.insumo_id}</td>
                    <td className="py-1 text-right">{r.cantidad} {insumos.find((i) => i.id === r.insumo_id)?.unidad}</td>
                    <td className="py-1 text-right">
                      <button onClick={() => eliminarReceta(r.insumo_id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                    </td>
                  </tr>
                ))}
                {!recetas.length && <tr><td colSpan={3} className="py-2 text-gray-400 text-center">Sin insumos</td></tr>}
              </tbody>
            </table>

            <div className="flex gap-2">
              <select className="input flex-1" value={nuevaReceta.insumo_id} onChange={(e) => setNuevaReceta({ ...nuevaReceta, insumo_id: e.target.value })}>
                <option value="">Insumo...</option>
                {insumos.map((i) => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>)}
              </select>
              <input className="input w-24" type="number" step="0.01" placeholder="Cant." value={nuevaReceta.cantidad} onChange={(e) => setNuevaReceta({ ...nuevaReceta, cantidad: e.target.value })} />
              <button onClick={agregarReceta} className="btn-primary">+</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

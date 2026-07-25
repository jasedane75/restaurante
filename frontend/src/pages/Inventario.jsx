import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api'

const UNIDADES = ['unidad', 'kg', 'g', 'litro', 'ml', 'porcion']

const ALERTA_STYLE = {
  ok:         'bg-green-100 text-green-700',
  stock_bajo: 'bg-yellow-100 text-yellow-700',
  sin_stock:  'bg-red-100 text-red-700',
}

export default function Inventario() {
  const [insumos, setInsumos] = useState([])
  const [form, setForm] = useState({ nombre: '', unidad: 'unidad', stock_actual: 0, stock_minimo: 0, contabilizar: true })
  const [ajuste, setAjuste] = useState({ insumo_id: null, cantidad: 0, tipo: 'entrada', referencia: '' })
  const [showForm, setShowForm] = useState(false)

  const cargar = () => api.get('/inventario/').then(({ data }) => setInsumos(data))
  useEffect(() => { cargar() }, [])

  const guardar = async (e) => {
    e.preventDefault()
    try {
      await api.post('/inventario/', form)
      toast.success('Insumo creado')
      setShowForm(false)
      setForm({ nombre: '', unidad: 'unidad', stock_actual: 0, stock_minimo: 0, contabilizar: true })
      cargar()
    } catch { toast.error('Error al guardar') }
  }

  const aplicarAjuste = async () => {
    if (!ajuste.insumo_id || !ajuste.cantidad) return
    try {
      await api.post(`/inventario/${ajuste.insumo_id}/ajuste`, {
        cantidad: Number(ajuste.cantidad),
        tipo: ajuste.tipo,
        referencia: ajuste.referencia,
      })
      toast.success('Stock actualizado')
      setAjuste({ insumo_id: null, cantidad: 0, tipo: 'entrada', referencia: '' })
      cargar()
    } catch { toast.error('Error al ajustar') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Inventario</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancelar' : '+ Nuevo insumo'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={guardar} className="card mb-6 grid grid-cols-2 gap-3">
          <input className="input" placeholder="Nombre" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <select className="input" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })}>
            {UNIDADES.map((u) => <option key={u}>{u}</option>)}
          </select>
          <input className="input" type="number" placeholder="Stock inicial" value={form.stock_actual} onChange={(e) => setForm({ ...form, stock_actual: e.target.value })} />
          <input className="input" type="number" placeholder="Stock mínimo (alerta)" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })} />
          <label className="flex items-center gap-2 col-span-2 text-sm">
            <input type="checkbox" checked={form.contabilizar} onChange={(e) => setForm({ ...form, contabilizar: e.target.checked })} />
            Contabilizar en recetas
          </label>
          <button type="submit" className="btn-primary col-span-2">Guardar</button>
        </form>
      )}

      {/* Panel de ajuste rápido */}
      <div className="card mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-40">
          <label className="text-xs text-gray-500 mb-1 block">Insumo</label>
          <select className="input" value={ajuste.insumo_id || ''} onChange={(e) => setAjuste({ ...ajuste, insumo_id: e.target.value })}>
            <option value="">Seleccionar...</option>
            {insumos.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
          <select className="input" value={ajuste.tipo} onChange={(e) => setAjuste({ ...ajuste, tipo: e.target.value })}>
            <option value="entrada">Entrada</option>
            <option value="ajuste">Ajuste</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Cantidad</label>
          <input className="input w-28" type="number" value={ajuste.cantidad} onChange={(e) => setAjuste({ ...ajuste, cantidad: e.target.value })} />
        </div>
        <div className="flex-1 min-w-40">
          <label className="text-xs text-gray-500 mb-1 block">Referencia</label>
          <input className="input" placeholder="ej: Compra proveedor" value={ajuste.referencia} onChange={(e) => setAjuste({ ...ajuste, referencia: e.target.value })} />
        </div>
        <button onClick={aplicarAjuste} className="btn-primary">Aplicar</button>
      </div>

      {/* Tabla */}
      <div className="card overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="pb-2">Insumo</th>
              <th className="pb-2">Unidad</th>
              <th className="pb-2 text-right">Stock actual</th>
              <th className="pb-2 text-right">Stock mínimo</th>
              <th className="pb-2 text-center">Contabilizar</th>
              <th className="pb-2 text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {insumos.map((i) => {
              const alerta = i.stock_actual <= 0 ? 'sin_stock' : i.stock_actual <= i.stock_minimo ? 'stock_bajo' : 'ok'
              return (
                <tr key={i.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 font-medium">{i.nombre}</td>
                  <td className="py-2 text-gray-500">{i.unidad}</td>
                  <td className="py-2 text-right font-mono">{i.stock_actual}</td>
                  <td className="py-2 text-right font-mono text-gray-400">{i.stock_minimo}</td>
                  <td className="py-2 text-center">{i.contabilizar ? '✅' : '—'}</td>
                  <td className="py-2 text-center">
                    <span className={`badge ${ALERTA_STYLE[alerta]}`}>
                      {alerta === 'ok' ? 'OK' : alerta === 'stock_bajo' ? 'Bajo' : 'Sin stock'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

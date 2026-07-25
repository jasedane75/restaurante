import { useEffect, useState } from 'react'
import api from '../api'

export default function Ventas() {
  const [ventas, setVentas] = useState([])
  const [resumen, setResumen] = useState([])
  const [top, setTop] = useState([])
  const [tab, setTab] = useState('ventas')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  const cargar = async () => {
    const params = new URLSearchParams()
    if (fechaDesde) params.append('fecha_desde', fechaDesde)
    if (fechaHasta) params.append('fecha_hasta', fechaHasta)

    const [v, r, t] = await Promise.all([
      api.get(`/ventas/?${params}`),
      api.get('/ventas/resumen-diario'),
      api.get('/ventas/productos-top'),
    ])
    setVentas(v.data)
    setResumen(r.data)
    setTop(t.data)
  }

  useEffect(() => { cargar() }, [])

  const totalDia = ventas.reduce((s, v) => s + v.total, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Ventas</h1>
        <div className="flex gap-2 items-center">
          <input type="date" className="input w-40" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
          <span className="text-gray-400">—</span>
          <input type="date" className="input w-40" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
          <button onClick={cargar} className="btn-primary">Filtrar</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card text-center">
          <p className="text-3xl font-bold text-brand-500">${totalDia.toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-1">Total ventas</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-brand-500">{ventas.length}</p>
          <p className="text-sm text-gray-500 mt-1">Transacciones</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-brand-500">
            ${ventas.length ? (totalDia / ventas.length).toFixed(2) : '0.00'}
          </p>
          <p className="text-sm text-gray-500 mt-1">Ticket promedio</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {['ventas', 'resumen', 'top'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`btn text-sm ${tab === t ? 'btn-primary' : 'btn-secondary'}`}>
            {t === 'ventas' ? '📋 Detalle' : t === 'resumen' ? '📅 Por día' : '🏆 Top productos'}
          </button>
        ))}
      </div>

      {tab === 'ventas' && (
        <div className="card overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">#</th>
                <th className="pb-2">Fecha</th>
                <th className="pb-2">Tipo</th>
                <th className="pb-2">Método pago</th>
                <th className="pb-2 text-right">Total</th>
                <th className="pb-2 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((v) => (
                <tr key={v.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 text-gray-400">{v.id}</td>
                  <td className="py-2">{new Date(v.creado_en).toLocaleString('es')}</td>
                  <td className="py-2 capitalize">{v.pedidos?.tipo || '—'}</td>
                  <td className="py-2 capitalize">{v.metodo_pago}</td>
                  <td className="py-2 text-right font-semibold">${v.total.toFixed(2)}</td>
                  <td className="py-2 text-center">
                    <span className={`badge ${v.estado_pago === 'pagado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {v.estado_pago}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'resumen' && (
        <div className="card overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Fecha</th>
                <th className="pb-2 text-right">Ventas</th>
                <th className="pb-2 text-right">Ingresos</th>
                <th className="pb-2 text-right">Ticket prom.</th>
                <th className="pb-2 text-right">Mesa</th>
                <th className="pb-2 text-right">Delivery</th>
              </tr>
            </thead>
            <tbody>
              {resumen.map((r) => (
                <tr key={r.fecha} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2">{r.fecha}</td>
                  <td className="py-2 text-right">{r.total_ventas}</td>
                  <td className="py-2 text-right font-semibold">${Number(r.ingresos_total).toFixed(2)}</td>
                  <td className="py-2 text-right">${Number(r.ticket_promedio).toFixed(2)}</td>
                  <td className="py-2 text-right">{r.pedidos_mesa}</td>
                  <td className="py-2 text-right">{r.pedidos_delivery}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'top' && (
        <div className="card overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">#</th>
                <th className="pb-2">Producto</th>
                <th className="pb-2">Categoría</th>
                <th className="pb-2 text-right">Unidades</th>
                <th className="pb-2 text-right">Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {top.map((p, i) => (
                <tr key={p.producto} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 text-gray-400">{i + 1}</td>
                  <td className="py-2 font-medium">{p.producto}</td>
                  <td className="py-2 text-gray-500">{p.categoria}</td>
                  <td className="py-2 text-right">{p.unidades_vendidas}</td>
                  <td className="py-2 text-right font-semibold">${Number(p.ingresos_total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

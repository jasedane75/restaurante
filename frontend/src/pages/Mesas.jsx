import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api'

const ESTADO_STYLE = {
  disponible:    'bg-green-100 border-green-400 text-green-800',
  ocupada:       'bg-red-100 border-red-400 text-red-800',
  reservada:     'bg-yellow-100 border-yellow-400 text-yellow-800',
  cuenta_pedida: 'bg-purple-100 border-purple-400 text-purple-800',
}

const ESTADO_LABEL = {
  disponible:    '✅ Disponible',
  ocupada:       '🔴 Ocupada',
  reservada:     '🟡 Reservada',
  cuenta_pedida: '🟣 Cuenta pedida',
}

export default function Mesas() {
  const [mesas, setMesas] = useState([])
  const [pedidosAbiertos, setPedidosAbiertos] = useState({})
  const navigate = useNavigate()

  const cargar = async () => {
    const [{ data: m }, { data: p }] = await Promise.all([
      api.get('/mesas/'),
      api.get('/pedidos/?estado=abierto'),
    ])
    setMesas(m)
    const map = {}
    p.forEach((ped) => { if (ped.mesa_id) map[ped.mesa_id] = ped.id })
    setPedidosAbiertos(map)
  }

  useEffect(() => { cargar() }, [])

  const handleClick = (mesa) => {
    if (pedidosAbiertos[mesa.id]) {
      navigate(`/pedido/${pedidosAbiertos[mesa.id]}`)
    } else if (mesa.estado === 'disponible' || mesa.estado === 'reservada') {
      navigate(`/pedido/nuevo/${mesa.id}`)
    } else {
      toast('Mesa ocupada sin pedido registrado')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mesas</h1>
        <button onClick={() => navigate('/pedido/nuevo/0')} className="btn-primary">
          + Delivery
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {mesas.map((mesa) => (
          <button
            key={mesa.id}
            onClick={() => handleClick(mesa)}
            className={`border-2 rounded-xl p-4 text-left transition-transform hover:scale-105 ${ESTADO_STYLE[mesa.estado]}`}
          >
            <p className="text-2xl font-bold">Mesa {mesa.numero}</p>
            <p className="text-xs mt-1">{mesa.capacidad} personas</p>
            <p className="text-xs mt-2 font-semibold">{ESTADO_LABEL[mesa.estado]}</p>
            {pedidosAbiertos[mesa.id] && (
              <p className="text-xs mt-1 opacity-70">Pedido #{pedidosAbiertos[mesa.id]}</p>
            )}
          </button>
        ))}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 mt-8">
        {Object.entries(ESTADO_LABEL).map(([k, v]) => (
          <span key={k} className={`badge border ${ESTADO_STYLE[k]} px-3 py-1`}>{v}</span>
        ))}
      </div>
    </div>
  )
}

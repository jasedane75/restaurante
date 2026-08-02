import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import api from '../api'

const NAV = [
  { to: '/',           label: '🍽️ Mesas',      roles: ['dueno','cajero','mesero'] },
  { to: '/ventas',     label: '💰 Ventas',      roles: ['dueno','cajero'] },
  { to: '/inventario', label: '📦 Inventario',  roles: ['dueno','cajero'] },
  { to: '/productos',  label: '📋 Productos',   roles: ['dueno'] },
]

export default function Layout() {
  const { usuario, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await api.post('/auth/logout').catch(() => {})
    logout()
    navigate('/login')
  }

  const links = NAV.filter((n) => n.roles.includes(usuario?.rol))

  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Mobile header */}
      <header className="md:hidden bg-[#3E2723] text-white flex items-center justify-between px-4 py-3">
        <p className="font-bold text-brand-500 text-lg">🍴 Restaurante</p>
        <button onClick={() => setMenuOpen(!menuOpen)} className="text-2xl">
          {menuOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="md:hidden bg-[#3E2723] text-white px-4 pb-4 space-y-1">
          {links.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-[#6D4C41] text-white' : 'text-gray-300 hover:bg-[#4E342E]'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
          <button onClick={handleLogout} className="w-full mt-2 btn-secondary text-sm">
            Cerrar sesión
          </button>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-[#3E2723] text-white flex-col">
        <div className="p-4 border-b border-[#5D4037]">
          <p className="font-bold text-brand-500 text-lg">🍴 Restaurante</p>
          <p className="text-xs text-gray-400 mt-1">{usuario?.nombre}</p>
          <span className="badge bg-brand-500 text-white mt-1">{usuario?.rol}</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {links.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-[#6D4C41] text-white' : 'text-gray-300 hover:bg-[#4E342E]'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={handleLogout} className="m-3 btn-secondary text-sm">
          Cerrar sesión
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  )
}

import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import Layout from './components/Layout'
import Login from './pages/Login'
import Mesas from './pages/Mesas'
import Pedido from './pages/Pedido'
import Inventario from './pages/Inventario'
import Ventas from './pages/Ventas'
import Productos from './pages/Productos'

function PrivateRoute({ children, roles }) {
  const { token, usuario } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (roles && !roles.includes(usuario?.rol)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { token } = useAuthStore()

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Mesas />} />
        <Route path="pedido/:pedidoId" element={<Pedido />} />
        <Route path="pedido/nuevo/:mesaId" element={<Pedido />} />
        <Route path="inventario" element={
          <PrivateRoute roles={['dueno', 'cajero']}><Inventario /></PrivateRoute>
        } />
        <Route path="ventas" element={
          <PrivateRoute roles={['dueno', 'cajero']}><Ventas /></PrivateRoute>
        } />
        <Route path="productos" element={
          <PrivateRoute roles={['dueno']}><Productos /></PrivateRoute>
        } />
      </Route>
    </Routes>
  )
}

import { create } from 'zustand'

const useAuthStore = create((set) => ({
  token: localStorage.getItem('token') || null,
  usuario: JSON.parse(localStorage.getItem('usuario') || 'null'),

  login: (token, usuario) => {
    localStorage.setItem('token', token)
    localStorage.setItem('usuario', JSON.stringify(usuario))
    set({ token, usuario })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    set({ token: null, usuario: null })
  },
}))

export default useAuthStore

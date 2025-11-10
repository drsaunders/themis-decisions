import { create } from 'zustand'

interface User {
  userId: string
  name: string
}

interface Store {
  user: User | null
  setUser: (user: User) => void
}

// Simple localStorage persistence
const loadUser = (): User | null => {
  try {
    const stored = localStorage.getItem('themis-user')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

const saveUser = (user: User | null) => {
  if (user) {
    localStorage.setItem('themis-user', JSON.stringify(user))
  } else {
    localStorage.removeItem('themis-user')
  }
}

export const useStore = create<Store>((set) => ({
  user: loadUser(),
  setUser: (user: User) => {
    saveUser(user)
    set({ user })
  },
}))


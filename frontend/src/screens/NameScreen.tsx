import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { createUser } from '../api'

export default function NameScreen() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const setUser = useStore((state) => state.setUser)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const user = await createUser(name.trim())
      setUser(user)
      navigate('/')
    } catch (error) {
      alert('Failed to create user. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{ 
        background: 'white', 
        padding: '40px', 
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        maxWidth: '400px',
        width: '100%'
      }}>
        <h1 style={{ marginBottom: '24px', textAlign: 'center' }}>Themis</h1>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="name" style={{ display: 'block', marginBottom: '8px' }}>
              Your name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              style={{ width: '100%' }}
              autoFocus
            />
          </div>
          <button type="submit" disabled={loading || !name.trim()} style={{ width: '100%' }}>
            {loading ? 'Creating...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}


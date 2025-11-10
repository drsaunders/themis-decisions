import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { listPolls, createPoll, Poll } from '../api'

export default function HomeScreen() {
  const user = useStore((state) => state.user)
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadPolls()
  }, [])

  const loadPolls = async () => {
    try {
      const data = await listPolls()
      setPolls(data)
    } catch (error) {
      alert('Failed to load polls')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePoll = async () => {
    const title = prompt('Enter poll title:')
    if (!title?.trim()) return

    setCreating(true)
    try {
      const poll = await createPoll(title.trim())
      navigate(`/poll/${poll.pollId}`)
    } catch (error) {
      alert('Failed to create poll')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Themis</h1>
        <div>
          <span style={{ marginRight: '16px' }}>{user?.name}</span>
          <button onClick={handleCreatePoll} disabled={creating}>
            {creating ? 'Creating...' : 'Create Poll'}
          </button>
        </div>
      </div>

      <div>
        <h2 style={{ marginBottom: '16px' }}>Polls</h2>
        {polls.length === 0 ? (
          <p style={{ color: '#666' }}>No polls yet. Create one to get started!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {polls.map((poll) => (
              <div
                key={poll.pollId}
                onClick={() => navigate(`/poll/${poll.pollId}`)}
                style={{
                  background: 'white',
                  padding: '16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{poll.title}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {new Date(poll.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


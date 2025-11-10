import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { listPolls, createPoll, Poll } from '../api'

export default function HomeScreen() {
  const user = useStore((state) => state.user)
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newPollTitle, setNewPollTitle] = useState('')
  const [princessMode, setPrincessMode] = useState(false)
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
    setShowCreateModal(true)
  }

  const handleSubmitPoll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPollTitle.trim() || !user) return

    setCreating(true)
    try {
      const poll = await createPoll(newPollTitle.trim(), user.userId, princessMode)
      setShowCreateModal(false)
      setNewPollTitle('')
      setPrincessMode(false)
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '36px', 
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #FFD700 0%, #FFC107 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>Themis</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ 
            fontSize: '16px', 
            fontWeight: '500',
            color: '#1A1A1A',
            padding: '8px 16px',
            background: 'rgba(255, 255, 255, 0.7)',
            borderRadius: '20px',
          }}>{user?.name}</span>
          <button onClick={handleCreatePoll} disabled={creating}>
            {creating ? 'Creating...' : 'Create Poll'}
          </button>
        </div>
      </div>

      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }} onClick={() => {
          setShowCreateModal(false)
          setNewPollTitle('')
          setPrincessMode(false)
        }}>
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(255, 193, 7, 0.3)',
            border: '3px solid #FFD700',
            maxWidth: '500px',
            width: '90%',
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: 'bold' }}>Create New Poll</h2>
            <form onSubmit={handleSubmitPoll}>
              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="pollTitle" style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Poll Title
                </label>
                <input
                  id="pollTitle"
                  type="text"
                  value={newPollTitle}
                  onChange={(e) => setNewPollTitle(e.target.value)}
                  placeholder="Enter poll title"
                  style={{ width: '100%' }}
                  autoFocus
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={princessMode}
                    onChange={(e) => setPrincessMode(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#FFD700' }}
                  />
                  <span style={{ fontSize: '16px', fontWeight: '500' }}>Princess mode</span>
                </label>
                <p style={{ marginTop: '8px', fontSize: '14px', color: '#666', marginLeft: '30px' }}>
                  Only you can rate items. Others can add items and see results, but cannot rate.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewPollTitle('')
                    setPrincessMode(false)
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #9E9E9E 0%, #757575 100%)',
                    color: 'white',
                  }}
                >
                  Cancel
                </button>
                <button type="submit" disabled={creating || !newPollTitle.trim()}>
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div>
        {(() => {
          const activePolls = polls.filter(poll => !poll.winner_id)
          const completedPolls = polls.filter(poll => poll.winner_id)
          
          return (
            <>
              {activePolls.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                  <h2 style={{ marginBottom: '16px' }}>Polls</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {activePolls.map((poll) => (
                      <div
                        key={poll.pollId}
                        onClick={() => navigate(`/poll/${poll.pollId}`)}
                        style={{
                          background: 'white',
                          padding: '18px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(255, 193, 7, 0.15)',
                          border: '2px solid transparent',
                          transition: 'all 0.3s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#FFD700'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 193, 7, 0.25)'
                          e.currentTarget.style.transform = 'translateY(-2px)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'transparent'
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 193, 7, 0.15)'
                          e.currentTarget.style.transform = 'translateY(0)'
                        }}
                      >
                        <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '16px', color: '#1A1A1A' }}>{poll.title}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {new Date(poll.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {activePolls.length === 0 && completedPolls.length === 0 && (
                <div>
                  <h2 style={{ marginBottom: '16px' }}>Polls</h2>
                  <p style={{ color: '#666' }}>No polls yet. Create one to get started!</p>
                </div>
              )}
              
              {completedPolls.length > 0 && (
                <div>
                  <h2 style={{ marginBottom: '16px' }}>Completed</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {completedPolls.map((poll) => (
                      <div
                        key={poll.pollId}
                        style={{
                          background: 'rgba(255, 255, 255, 0.5)',
                          padding: '18px',
                          borderRadius: '12px',
                          cursor: 'not-allowed',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                          opacity: 0.6,
                          border: '1px solid rgba(255, 193, 7, 0.2)',
                        }}
                      >
                        <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#666', fontSize: '16px' }}>{poll.title}</div>
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          {new Date(poll.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )
        })()}
      </div>
    </div>
  )
}


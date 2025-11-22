import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { listPolls, createPoll, deletePoll, clonePoll, Poll, createHomeWebSocket } from '../api'

export default function HomeScreen() {
  const user = useStore((state) => state.user)
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newPollTitle, setNewPollTitle] = useState('')
  const [princessMode, setPrincessMode] = useState(false)
  const navigate = useNavigate()
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    loadPolls()

    // Connect to WebSocket for real-time updates
    const ws = createHomeWebSocket()
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      if (message.type === 'poll_created') {
        // Add new poll to the list if it doesn't already exist
        setPolls((prevPolls) => {
          // Check if poll already exists to prevent duplicates
          if (prevPolls.some(p => p.pollId === message.poll.pollId)) {
            return prevPolls
          }
          // Add new poll at the beginning (most recent first)
          return [message.poll, ...prevPolls]
        })
      } else if (message.type === 'poll_deleted') {
        // Remove deleted poll from the list
        setPolls((prevPolls) => prevPolls.filter(p => p.pollId !== message.pollId))
      } else if (message.type === 'poll_cloned') {
        // Add cloned poll to the list if it doesn't already exist
        setPolls((prevPolls) => {
          // Check if poll already exists to prevent duplicates
          if (prevPolls.some(p => p.pollId === message.poll.pollId)) {
            return prevPolls
          }
          // Add new poll at the beginning (most recent first)
          return [message.poll, ...prevPolls]
        })
      }
    }
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
    wsRef.current = ws

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
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

  const handleDeletePoll = async (pollId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this poll? This action cannot be undone.')) {
      return
    }
    try {
      await deletePoll(pollId)
      // Poll will be removed via WebSocket update
    } catch (error) {
      alert('Failed to delete poll')
    }
  }

  const handleClonePoll = async (pollId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) return
    try {
      await clonePoll(pollId, user.userId)
      // Poll will be added via WebSocket update
    } catch (error) {
      alert('Failed to clone poll')
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '16px', color: '#1A1A1A' }}>{poll.title}</div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              {new Date(poll.created_at).toLocaleString()}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                            <button
                              onClick={(e) => handleClonePoll(poll.pollId, e)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                background: 'linear-gradient(135deg, #757575 0%, #616161 100%)',
                                opacity: 1,
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '500',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '0.9'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '1'
                              }}
                            >
                              Clone
                            </button>
                            <button
                              onClick={(e) => handleDeletePoll(poll.pollId, e)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                background: 'linear-gradient(135deg, #757575 0%, #616161 100%)',
                                opacity: 1,
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '500',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '0.9'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '1'
                              }}
                            >
                              Delete
                            </button>
                          </div>
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
                          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                          border: '1px solid rgba(255, 193, 7, 0.2)',
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1, opacity: 0.6 }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#666', fontSize: '16px' }}>{poll.title}</div>
                            <div style={{ fontSize: '12px', color: '#999' }}>
                              {new Date(poll.created_at).toLocaleString()}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginLeft: '12px', position: 'relative', zIndex: 1 }}>
                            <button
                              onClick={(e) => handleClonePoll(poll.pollId, e)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                background: 'linear-gradient(135deg, #757575 0%, #616161 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '500',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '0.9'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '1'
                              }}
                            >
                              Clone
                            </button>
                            <button
                              onClick={(e) => handleDeletePoll(poll.pollId, e)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                background: 'linear-gradient(135deg, #757575 0%, #616161 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '500',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '0.9'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '1'
                              }}
                            >
                              Delete
                            </button>
                          </div>
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


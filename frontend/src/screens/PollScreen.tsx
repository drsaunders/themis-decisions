import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import {
  joinPoll,
  listOptions,
  createOption,
  submitVote,
  markReady,
  getStatus,
  Option,
  VoteEntry,
  createWebSocket,
} from '../api'

export default function PollScreen() {
  const { pollId } = useParams<{ pollId: string }>()
  const user = useStore((state) => state.user)
  const navigate = useNavigate()

  const [options, setOptions] = useState<Option[]>([])
  const [votes, setVotes] = useState<Record<string, { rating: number | null; veto: boolean }>>({})
  const [readyCount, setReadyCount] = useState(0)
  const [totalParticipants, setTotalParticipants] = useState(0)
  const [pollTitle, setPollTitle] = useState('')
  const [creatorId, setCreatorId] = useState<string | null>(null)
  const [princessMode, setPrincessMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newOptionLabel, setNewOptionLabel] = useState('')
  const [ready, setReady] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const saveTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!pollId || !user) return

    const init = async () => {
      try {
        // Join poll
        await joinPoll(pollId, user.userId)

        // Load options and status
        const [opts, status] = await Promise.all([
          listOptions(pollId),
          getStatus(pollId),
        ])

        setOptions(opts)
        setPollTitle(status.title)
        setReadyCount(status.readyCount)
        setTotalParticipants(status.totalParticipants)
        setCreatorId(status.creator_id || null)
        setPrincessMode(status.princess_mode || false)

        // Connect WebSocket
        const ws = createWebSocket(pollId)
        ws.onmessage = (event) => {
          const message = JSON.parse(event.data)
          handleWebSocketMessage(message)
        }
        ws.onerror = (error) => {
          console.error('WebSocket error:', error)
        }
        wsRef.current = ws

        setLoading(false)
      } catch (error) {
        alert('Failed to load poll')
        navigate('/')
      }
    }

    init()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [pollId, user, navigate])

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'option_added':
        setOptions((prev) => {
          // Check if option already exists to prevent duplicates
          if (prev.some(opt => opt.id === message.option.id)) {
            return prev
          }
          return [...prev, message.option]
        })
        break
      case 'ready_counts':
        setReadyCount(message.ready)
        setTotalParticipants(message.participants)
        break
      case 'reveal':
        navigate(`/poll/${pollId}/result`)
        break
      case 'participant_joined':
      case 'participant_left':
        setTotalParticipants(message.participants)
        break
    }
  }

  const debouncedSaveVotes = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      saveVotes()
    }, 300)
  }

  const saveVotes = async () => {
    if (!pollId || !user || saving) return

    setSaving(true)
    try {
      const entries: VoteEntry[] = Object.entries(votes).map(([optionId, vote]) => ({
        optionId,
        rating: vote.veto ? null : vote.rating,
        veto: vote.veto,
      }))
      await submitVote(pollId, user.userId, entries)
    } catch (error) {
      console.error('Failed to save votes:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleRatingChange = (optionId: string, rating: number) => {
    setVotes((prev) => ({
      ...prev,
      [optionId]: { ...prev[optionId], rating, veto: false },
    }))
    debouncedSaveVotes()
  }

  const handleVetoChange = (optionId: string, veto: boolean) => {
    setVotes((prev) => ({
      ...prev,
      [optionId]: { ...prev[optionId], veto, rating: veto ? null : prev[optionId]?.rating || 5 },
    }))
    debouncedSaveVotes()
  }

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pollId || !newOptionLabel.trim()) return

    try {
      await createOption(pollId, newOptionLabel.trim())
      // Don't add optimistically - let WebSocket message handle it
      setNewOptionLabel('')
    } catch (error) {
      alert('Failed to add option')
    }
  }

  const handleReady = async () => {
    if (!pollId || !user) return

    try {
      await markReady(pollId, user.userId)
      setReady(true)
    } catch (error) {
      alert('Failed to mark ready')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading poll...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ 
          marginBottom: '8px',
          fontSize: '32px',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #FFD700 0%, #FFC107 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>{pollTitle || 'Poll'}</h1>
        <div style={{ 
          fontSize: '14px', 
          color: '#666',
          padding: '6px 12px',
          background: 'rgba(255, 255, 255, 0.7)',
          borderRadius: '20px',
          display: 'inline-block',
        }}>
          Ready: {readyCount}/{totalParticipants}
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <form onSubmit={handleAddOption} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={newOptionLabel}
            onChange={(e) => setNewOptionLabel(e.target.value)}
            placeholder="Add option..."
            style={{ flex: 1 }}
          />
          <button type="submit">Add</button>
        </form>
      </div>

      {princessMode && creatorId !== user?.userId && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          background: 'rgba(255, 193, 7, 0.15)',
          border: '2px solid #FFC107',
          borderRadius: '8px',
          color: '#1A1A1A',
          fontSize: '14px',
          fontWeight: '500',
        }}>
          👑 Princess mode is active. Only the poll creator can rate items. You can add options and see results.
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>Options</h2>
        {options.length === 0 ? (
          <p style={{ color: '#666' }}>No options yet. Add one above!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {options.map((option) => (
              <div
                key={option.id}
                style={{
                  background: 'white',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(255, 193, 7, 0.15)',
                  border: '2px solid rgba(255, 215, 0, 0.2)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{option.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <span style={{ minWidth: '50px', fontWeight: '600', fontSize: '15px', color: '#1A1A1A' }}>Rating:</span>
                      <div style={{ flex: 1, padding: '8px 0', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={votes[option.id]?.rating ?? 5}
                        onChange={(e) => handleRatingChange(option.id, parseInt(e.target.value))}
                        disabled={
                          votes[option.id]?.veto || 
                          (princessMode && creatorId !== user?.userId)
                        }
                        style={{ width: '100%' }}
                      />
                      </div>
                      <span style={{ 
                        minWidth: '30px', 
                        textAlign: 'right', 
                        fontWeight: 'bold',
                        fontSize: '18px',
                        color: '#FFC107',
                        background: 'rgba(255, 215, 0, 0.1)',
                        padding: '4px 8px',
                        borderRadius: '6px',
                      }}>
                        {votes[option.id]?.rating ?? 5}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleVetoChange(option.id, !votes[option.id]?.veto)}
                      disabled={princessMode && creatorId !== user?.userId}
                      style={{
                        padding: '6px 16px',
                        fontWeight: 'bold',
                        background: votes[option.id]?.veto 
                          ? 'linear-gradient(135deg, #F44336 0%, #D32F2F 100%)' 
                          : 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: (princessMode && creatorId !== user?.userId) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                        whiteSpace: 'nowrap',
                        boxShadow: votes[option.id]?.veto 
                          ? '0 2px 8px rgba(244, 67, 54, 0.3)' 
                          : '0 2px 8px rgba(255, 152, 0, 0.3)',
                        opacity: (princessMode && creatorId !== user?.userId) ? 0.5 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!votes[option.id]?.veto) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #F57C00 0%, #E65100 100%)'
                          e.currentTarget.style.transform = 'translateY(-1px)'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 152, 0, 0.4)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!votes[option.id]?.veto) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)'
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 152, 0, 0.3)'
                        }
                      }}
                    >
                      {votes[option.id]?.veto ? 'VETOED' : 'VETO'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {saving && (
        <div style={{ marginBottom: '16px', fontSize: '12px', color: '#666' }}>
          Saving changes...
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
        <button 
          onClick={() => navigate('/')} 
          style={{ 
            background: 'linear-gradient(135deg, #9E9E9E 0%, #757575 100%)',
            color: 'white',
            boxShadow: '0 2px 8px rgba(117, 117, 117, 0.3)',
          }}
        >
          Back to Home
        </button>
        <button onClick={handleReady} disabled={ready || options.length === 0}>
          {ready ? 'Ready!' : "I'm Ready"}
        </button>
      </div>
    </div>
  )
}


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
        setReadyCount(status.readyCount)
        setTotalParticipants(status.totalParticipants)

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
        setOptions((prev) => [...prev, message.option])
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
      [optionId]: { ...prev[optionId], veto, rating: veto ? null : prev[optionId]?.rating || 0 },
    }))
    debouncedSaveVotes()
  }

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pollId || !newOptionLabel.trim()) return

    try {
      const option = await createOption(pollId, newOptionLabel.trim())
      setOptions((prev) => [...prev, option])
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Poll</h1>
        <div style={{ fontSize: '14px', color: '#666' }}>
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

      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '16px' }}>Options</h2>
        {options.length === 0 ? (
          <p style={{ color: '#666' }}>No options yet. Add one above!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {options.map((option) => (
              <div
                key={option.id}
                style={{
                  background: 'white',
                  padding: '16px',
                  borderRadius: '4px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ marginBottom: '12px', fontWeight: 'bold' }}>{option.label}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ minWidth: '60px' }}>Rating:</span>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={votes[option.id]?.rating ?? 0}
                        onChange={(e) => handleRatingChange(option.id, parseInt(e.target.value))}
                        disabled={votes[option.id]?.veto}
                        style={{ flex: 1 }}
                      />
                      <span style={{ minWidth: '30px', textAlign: 'right' }}>
                        {votes[option.id]?.rating ?? 0}
                      </span>
                    </label>
                  </div>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={votes[option.id]?.veto ?? false}
                        onChange={(e) => handleVetoChange(option.id, e.target.checked)}
                      />
                      <span>Veto</span>
                    </label>
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
        <button onClick={() => navigate('/')} style={{ background: '#6c757d' }}>
          Back to Home
        </button>
        <button onClick={handleReady} disabled={ready || options.length === 0}>
          {ready ? 'Ready!' : "I'm Ready"}
        </button>
      </div>
    </div>
  )
}


import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getStatus, Option } from '../api'

export default function ResultScreen() {
  const { pollId } = useParams<{ pollId: string }>()
  const [winner, setWinner] = useState<Option | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!pollId) return

    const loadResult = async () => {
      try {
        const status = await getStatus(pollId)
        if (status.winner) {
          setWinner(status.winner)
        }
      } catch (error) {
        alert('Failed to load result')
      } finally {
        setLoading(false)
      }
    }

    loadResult()
  }, [pollId])

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading result...</p>
      </div>
    )
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
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center'
      }}>
        <h1 style={{ marginBottom: '24px' }}>Winner</h1>
        {winner ? (
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '32px', color: '#007bff' }}>
            {winner.label}
          </div>
        ) : (
          <div style={{ marginBottom: '32px', color: '#666' }}>
            No winner determined
          </div>
        )}
        <button onClick={() => navigate('/')} style={{ width: '100%' }}>
          Back to Home
        </button>
      </div>
    </div>
  )
}


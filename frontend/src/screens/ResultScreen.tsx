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
        padding: '48px', 
        borderRadius: '16px',
        boxShadow: '0 8px 24px rgba(255, 193, 7, 0.2)',
        border: '3px solid #FFD700',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          marginBottom: '32px',
          fontSize: '36px',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #FFD700 0%, #FFC107 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>Winner</h1>
        {winner ? (
          <div style={{ 
            fontSize: '32px', 
            fontWeight: 'bold', 
            marginBottom: '40px', 
            padding: '20px',
            background: 'linear-gradient(135deg, #FFF9C4 0%, #FFE082 100%)',
            borderRadius: '12px',
            color: '#1A1A1A',
            border: '2px solid #FFD700',
            boxShadow: '0 4px 12px rgba(255, 193, 7, 0.3)',
          }}>
            {winner.label}
          </div>
        ) : (
          <div style={{ marginBottom: '40px', color: '#666', fontSize: '18px' }}>
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


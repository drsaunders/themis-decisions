import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getStatus, Option } from '../api'

export default function ResultScreen() {
  const { pollId } = useParams<{ pollId: string }>()
  const [winner, setWinner] = useState<Option | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEffects, setShowEffects] = useState(false)
  const navigate = useNavigate()

  
  useEffect(() => {
    if (!pollId) return

    const loadResult = async () => {
      try {
        const status = await getStatus(pollId)
        if (status.winner) {
          setWinner(status.winner)
          // Trigger celebration effects after a short delay
          setTimeout(() => setShowEffects(true), 300)
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
  // Generate stars for animation
  const stars = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 2,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 4 + Math.random() * 8,
  }))

  // Generate confetti particles
  const confetti = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    delay: Math.random() * 1.5,
    duration: 3 + Math.random() * 2,
    x: Math.random() * 100,
    rotation: Math.random() * 360,
    color: ['#FFD700', '#FFC107', '#FF9800', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'][Math.floor(Math.random() * 7)],
  }))
  
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated stars */}
      {showEffects && winner && stars.map((star) => (
        <div
          key={star.id}
          style={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            background: '#FFD700',
            borderRadius: '50%',
            boxShadow: `0 0 ${star.size * 2}px #FFD700, 0 0 ${star.size * 3}px #FFC107`,
            animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      ))}

      {/* Confetti particles */}
      {showEffects && winner && confetti.map((particle) => (
        <div
          key={particle.id}
          style={{
            position: 'absolute',
            left: `${particle.x}%`,
            top: '-10px',
            width: '12px',
            height: '12px',
            background: particle.color,
            borderRadius: '2px',
            animation: `confettiFall ${particle.duration}s ease-in ${particle.delay}s forwards`,
            transform: `rotate(${particle.rotation}deg)`,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      ))}

      <div style={{ 
        background: 'white', 
        padding: '48px', 
        borderRadius: '16px',
        boxShadow: '0 8px 24px rgba(255, 193, 7, 0.2)',
        border: '3px solid #FFD700',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        position: 'relative',
        zIndex: 2,
        animation: showEffects && winner ? 'pulse 2s ease-in-out infinite' : 'none',
      }}>
        <h1 style={{ 
          marginBottom: '32px',
          fontSize: '36px',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #FFD700 0%, #FFC107 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: showEffects && winner ? 'bounce 1s ease-in-out infinite' : 'none',
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
            animation: showEffects ? 'celebrate 1.5s ease-in-out infinite' : 'none',
            position: 'relative',
          }}>
            {winner.label}
            {showEffects && (
              <>
                <span style={{
                  position: 'absolute',
                  top: '-20px',
                  left: '20%',
                  fontSize: '24px',
                  animation: 'sparkle 1s ease-in-out infinite',
                }}>✨</span>
                <span style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '20%',
                  fontSize: '24px',
                  animation: 'sparkle 1s ease-in-out 0.3s infinite',
                }}>⭐</span>
                <span style={{
                  position: 'absolute',
                  bottom: '-20px',
                  left: '30%',
                  fontSize: '24px',
                  animation: 'sparkle 1s ease-in-out 0.6s infinite',
                }}>🌟</span>
                <span style={{
                  position: 'absolute',
                  bottom: '-20px',
                  right: '30%',
                  fontSize: '24px',
                  animation: 'sparkle 1s ease-in-out 0.9s infinite',
                }}>💫</span>
              </>
            )}
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
      <style>{`
        @keyframes twinkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: scale(1) rotate(180deg);
          }
        }

        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 8px 24px rgba(255, 193, 7, 0.2), 0 0 0 0 rgba(255, 215, 0, 0.4);
          }
          50% {
            box-shadow: 0 8px 24px rgba(255, 193, 7, 0.4), 0 0 0 20px rgba(255, 215, 0, 0);
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes celebrate {
          0%, 100% {
            transform: scale(1) rotate(0deg);
          }
          25% {
            transform: scale(1.05) rotate(-2deg);
          }
          75% {
            transform: scale(1.05) rotate(2deg);
          }
        }

        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  )
}


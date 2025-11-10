const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000'
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:10000'

export interface User {
  userId: string
  name: string
}

export interface Poll {
  pollId: string
  title: string
  created_at: string
  winner_id?: string | null
  creator_id?: string | null
  princess_mode?: boolean
}

export interface Option {
  id: string
  label: string
}

export interface VoteEntry {
  optionId: string
  rating: number | null
  veto: boolean
}

export async function createUser(name: string): Promise<User> {
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!response.ok) throw new Error('Failed to create user')
  return response.json()
}

export async function listPolls(): Promise<Poll[]> {
  const response = await fetch(`${API_URL}/polls`)
  if (!response.ok) throw new Error('Failed to fetch polls')
  return response.json()
}

export async function createPoll(title: string, creatorId: string, princessMode: boolean = false): Promise<Poll> {
  const response = await fetch(`${API_URL}/polls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, creator_id: creatorId, princess_mode: princessMode }),
  })
  if (!response.ok) throw new Error('Failed to create poll')
  return response.json()
}

export async function joinPoll(pollId: string, userId: string): Promise<{ participantId: string }> {
  const response = await fetch(`${API_URL}/polls/${pollId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
  if (!response.ok) throw new Error('Failed to join poll')
  return response.json()
}

export async function listOptions(pollId: string): Promise<Option[]> {
  const response = await fetch(`${API_URL}/polls/${pollId}/options`)
  if (!response.ok) throw new Error('Failed to fetch options')
  return response.json()
}

export async function createOption(pollId: string, label: string): Promise<Option> {
  const response = await fetch(`${API_URL}/polls/${pollId}/options`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label }),
  })
  if (!response.ok) throw new Error('Failed to create option')
  return response.json()
}

export async function submitVote(pollId: string, userId: string, entries: VoteEntry[]): Promise<void> {
  const response = await fetch(`${API_URL}/polls/${pollId}/vote`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, entries }),
  })
  if (!response.ok) throw new Error('Failed to submit vote')
}

export async function markReady(pollId: string, userId: string): Promise<{ readyCount: number; totalParticipants: number }> {
  const response = await fetch(`${API_URL}/polls/${pollId}/ready`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
  if (!response.ok) throw new Error('Failed to mark ready')
  return response.json()
}

export async function getStatus(pollId: string): Promise<{
  title: string
  readyCount: number
  totalParticipants: number
  optionCount: number
  winner: Option | null
  creator_id?: string | null
  princess_mode?: boolean
}> {
  const response = await fetch(`${API_URL}/polls/${pollId}/status`)
  if (!response.ok) throw new Error('Failed to get status')
  return response.json()
}

export async function revealWinner(pollId: string): Promise<{ winner: Option }> {
  const response = await fetch(`${API_URL}/polls/${pollId}/reveal`, {
    method: 'POST',
  })
  if (!response.ok) throw new Error('Failed to reveal winner')
  return response.json()
}

export function createWebSocket(pollId: string): WebSocket {
  // Handle both full URLs and protocol-relative URLs
  let wsBase = WS_URL
  if (wsBase.startsWith('http://')) {
    wsBase = wsBase.replace('http://', 'ws://')
  } else if (wsBase.startsWith('https://')) {
    wsBase = wsBase.replace('https://', 'wss://')
  } else if (!wsBase.startsWith('ws://') && !wsBase.startsWith('wss://')) {
    // If no protocol, assume ws for localhost, wss for others
    wsBase = (wsBase.includes('localhost') || wsBase.includes('127.0.0.1')) 
      ? `ws://${wsBase}` 
      : `wss://${wsBase}`
  }
  return new WebSocket(`${wsBase}/ws/polls/${pollId}`)
}


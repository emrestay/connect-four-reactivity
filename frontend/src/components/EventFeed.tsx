import { useState, useEffect, useRef } from 'react'
import { formatEther, type PublicClient } from 'viem'
import { GAME_ADDRESS, GameABI } from '../config'

type EventItem = { id: number; time: string; icon: string; text: string }
type Props = { wsClient: PublicClient | null }

export default function EventFeed({ wsClient }: Props) {
  const [events, setEvents] = useState<EventItem[]>([])
  const [connected, setConnected] = useState(false)
  const counter = useRef(0)

  useEffect(() => {
    if (!wsClient) return
    let cancelled = false

    const unwatch = wsClient.watchContractEvent({
      address: GAME_ADDRESS,
      abi: GameABI,
      onLogs: (logs) => {
        if (cancelled) return
        for (const log of logs) {
          const id = ++counter.current
          const time = new Date().toLocaleTimeString()
          const a = log.args as any
          let icon = '', text = ''

          switch (log.eventName) {
            case 'GameCreated':
              icon = '🎮'; text = `Game #${a.gameId} created (${formatEther(a.stake)} STT)`; break
            case 'GameStarted':
              icon = '⚔️'; text = `Game #${a.gameId} started!`; break
            case 'MovePlayed':
              icon = '⬇️'; text = `#${a.gameId} move: col ${a.column}`; break
            case 'GameWon':
              icon = '🏆'; text = `#${a.gameId} won by ${(a.winner as string).slice(0, 8)}...`; break
            case 'GameDraw':
              icon = '🤝'; text = `#${a.gameId} ended in draw`; break
            case 'PrizeDistributed':
              icon = '💰'; text = `#${a.gameId} ${formatEther(a.amount)} STT paid`; break
            default: continue
          }
          setEvents(prev => [{ id, time, icon, text }, ...prev].slice(0, 40))
        }
      },
      onError: (e) => console.error('Watch error:', e),
    })

    if (!cancelled) setConnected(true)
    return () => { cancelled = true; unwatch() }
  }, [wsClient])

  return (
    <div className="event-feed-panel">
      <div className="feed-header">
        <h3>Live Events</h3>
        <span className={`dot ${connected ? 'dot-on' : 'dot-off'}`} />
      </div>
      <div className="feed-list">
        {events.length === 0 && <p className="muted center">Waiting for activity...</p>}
        {events.map(e => (
          <div key={e.id} className="feed-item">
            <span className="feed-icon">{e.icon}</span>
            <span className="feed-text">{e.text}</span>
            <span className="feed-time">{e.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

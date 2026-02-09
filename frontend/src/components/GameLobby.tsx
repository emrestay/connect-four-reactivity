import { useState, useEffect, useCallback } from 'react'
import {
  parseEther, formatEther,
  type Address, type WalletClient, type PublicClient,
} from 'viem'
import { GAME_ADDRESS, GameABI } from '../config'

type GameSummary = {
  id: bigint
  player1: Address
  player2: Address
  status: number
  stake: bigint
}

type Props = {
  address: Address
  walletClient: WalletClient
  publicClient: PublicClient
  onSelectGame: (id: bigint) => void
  selectedGame: bigint | null
}

export default function GameLobby({ address, walletClient, publicClient, onSelectGame, selectedGame }: Props) {
  const [games, setGames] = useState<GameSummary[]>([])
  const [stake, setStake] = useState('0.05')
  const [loading, setLoading] = useState('')

  const loadGames = useCallback(async () => {
    try {
      const count = await publicClient.readContract({
        address: GAME_ADDRESS, abi: GameABI, functionName: 'nextGameId',
      }) as bigint

      const list: GameSummary[] = []
      const start = count > 20n ? count - 20n : 0n
      for (let i = start; i < count; i++) {
        const g = await publicClient.readContract({
          address: GAME_ADDRESS, abi: GameABI, functionName: 'getGame', args: [i],
        }) as [Address, Address, number, number, bigint, Address, boolean, number]
        list.push({ id: i, player1: g[0], player2: g[1], status: Number(g[3]), stake: g[4] })
      }
      setGames(list)
    } catch { /* ignore */ }
  }, [publicClient])

  useEffect(() => {
    loadGames()
    const iv = setInterval(loadGames, 6000)
    return () => clearInterval(iv)
  }, [loadGames])

  const exec = async (label: string, fn: () => Promise<`0x${string}`>) => {
    setLoading(label)
    try {
      const hash = await fn()
      await publicClient.waitForTransactionReceipt({ hash })
      await loadGames()
    } catch (e: any) {
      alert(e.shortMessage || e.message)
    } finally {
      setLoading('')
    }
  }

  const createGame = () => exec('Creating...', () =>
    walletClient.writeContract({
      address: GAME_ADDRESS, abi: GameABI, chain: walletClient.chain,
      account: address, functionName: 'createGame', value: parseEther(stake),
    })
  )

  const joinGame = (gameId: bigint, stakeAmount: bigint) => exec('Joining...', () =>
    walletClient.writeContract({
      address: GAME_ADDRESS, abi: GameABI, chain: walletClient.chain,
      account: address, functionName: 'joinGame', args: [gameId], value: stakeAmount,
    })
  )

  const statusLabel = (s: number) => ['Waiting', 'Playing', 'Won', 'Draw'][s] || '?'

  return (
    <div className="lobby">
      <h2>Games</h2>

      {/* Create Game */}
      <div className="card create-card">
        <h3>New Game</h3>
        <div className="form-row">
          <div className="amount-chips">
            {['0.01', '0.05', '0.1', '0.5'].map(v => (
              <button key={v} className={`chip ${stake === v ? 'active' : ''}`} onClick={() => setStake(v)}>
                {v} STT
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={createGame} disabled={!!loading}>
            {loading === 'Creating...' ? '...' : 'Create'}
          </button>
        </div>
      </div>

      {/* Game List */}
      <div className="game-list">
        {games.length === 0 && <p className="muted">No games yet</p>}
        {[...games].reverse().map(g => {
          const isP1 = g.player1.toLowerCase() === address.toLowerCase()
          const isP2 = g.player2.toLowerCase() === address.toLowerCase()
          const isActive = selectedGame === g.id
          return (
            <div
              key={g.id.toString()}
              className={`game-row ${isActive ? 'active' : ''} ${g.status >= 2 ? 'finished' : ''}`}
              onClick={() => onSelectGame(g.id)}
            >
              <span className="game-id">#{g.id.toString()}</span>
              <span className={`status-badge status-${g.status}`}>{statusLabel(g.status)}</span>
              <span className="game-stake">{formatEther(g.stake)} STT</span>
              {g.status === 0 && !isP1 && (
                <button
                  className="btn btn-small btn-primary"
                  onClick={(e) => { e.stopPropagation(); joinGame(g.id, g.stake) }}
                  disabled={!!loading}
                >
                  Join
                </button>
              )}
              {(isP1 || isP2) && <span className="you-badge">You</span>}
            </div>
          )
        })}
      </div>

      {loading && <div className="status loading">{loading}</div>}
    </div>
  )
}

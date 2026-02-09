import { formatEther, type Address } from 'viem'

type Props = {
  gameId: bigint
  player1: Address
  player2: Address
  currentTurn: number
  status: number
  stake: bigint
  winner: Address
  prizePaid: boolean
  myPlayer: number
}

const ZERO = '0x0000000000000000000000000000000000000000'

export default function GameInfo({ gameId, player1, player2, currentTurn, status, stake, winner, prizePaid, myPlayer }: Props) {
  const short = (a: string) => a === ZERO ? '...' : `${a.slice(0, 6)}...${a.slice(-4)}`
  const statusLabels = ['Waiting for opponent', 'Game in progress', 'Game over — Winner!', 'Game over — Draw']

  return (
    <div className="game-info">
      <div className="info-header">
        <span className="game-title">Game #{gameId.toString()}</span>
        <span className="info-stake">Pool: {formatEther(stake * 2n)} STT</span>
      </div>

      <div className="players-row">
        <div className={`player-card ${currentTurn === 1 && status === 1 ? 'active-turn' : ''} ${myPlayer === 1 ? 'is-you' : ''}`}>
          <div className="piece piece-small piece-red" />
          <div className="player-label">
            <span>{myPlayer === 1 ? 'You' : short(player1)}</span>
            {status === 2 && winner.toLowerCase() === player1.toLowerCase() && <span className="winner-tag">Winner</span>}
          </div>
        </div>
        <span className="vs">vs</span>
        <div className={`player-card ${currentTurn === 2 && status === 1 ? 'active-turn' : ''} ${myPlayer === 2 ? 'is-you' : ''}`}>
          <div className="piece piece-small piece-yellow" />
          <div className="player-label">
            <span>{player2 === ZERO ? 'Waiting...' : myPlayer === 2 ? 'You' : short(player2)}</span>
            {status === 2 && winner.toLowerCase() === player2.toLowerCase() && <span className="winner-tag">Winner</span>}
          </div>
        </div>
      </div>

      <div className={`status-bar status-bar-${status}`}>
        {statusLabels[status]}
        {status >= 2 && (prizePaid ? ' — Prize paid' : ' — Awaiting payout...')}
      </div>
    </div>
  )
}

import { useState } from 'react'

type Props = {
  board: number[][]     // [row][col], 0=empty, 1=red, 2=yellow
  currentTurn: number   // 1 or 2
  myPlayer: number      // 1 or 2 (0 if spectator)
  isMyTurn: boolean
  gameActive: boolean
  onDrop: (col: number) => void
}

export default function Board({ board, currentTurn, myPlayer, isMyTurn, gameActive, onDrop }: Props) {
  const [hoverCol, setHoverCol] = useState<number | null>(null)

  const canPlay = gameActive && isMyTurn

  return (
    <div className="board-wrapper">
      {/* Column hover indicators */}
      <div className="board-indicators">
        {Array.from({ length: 7 }, (_, c) => (
          <div
            key={c}
            className={`indicator ${canPlay && hoverCol === c ? 'visible' : ''}`}
          >
            <div className={`piece piece-preview ${myPlayer === 1 ? 'piece-red' : 'piece-yellow'}`} />
          </div>
        ))}
      </div>

      {/* Board grid */}
      <div
        className="board"
        onMouseLeave={() => setHoverCol(null)}
      >
        {/* Render rows top-to-bottom (row 5 first) */}
        {Array.from({ length: 6 }, (_, ri) => {
          const r = 5 - ri
          return Array.from({ length: 7 }, (_, c) => {
            const v = board[r]?.[c] ?? 0
            return (
              <div
                key={`${r}-${c}`}
                className="cell"
                onMouseEnter={() => canPlay && setHoverCol(c)}
                onClick={() => canPlay && onDrop(c)}
              >
                <div className={`piece ${v === 1 ? 'piece-red' : v === 2 ? 'piece-yellow' : 'piece-empty'}`} />
              </div>
            )
          })
        })}
      </div>

      {/* Turn indicator */}
      {gameActive && (
        <div className="turn-indicator">
          <div className={`piece piece-small ${currentTurn === 1 ? 'piece-red' : 'piece-yellow'}`} />
          <span>
            {isMyTurn ? 'Your turn' : currentTurn === 1 ? "Red's turn" : "Yellow's turn"}
          </span>
        </div>
      )}
    </div>
  )
}

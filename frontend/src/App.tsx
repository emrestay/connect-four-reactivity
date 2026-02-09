import { useState, useEffect, useCallback, useRef } from 'react'
import {
  createPublicClient, createWalletClient, custom, http, webSocket,
  formatEther, type Address, type WalletClient, type PublicClient,
} from 'viem'
import { somniaTestnet, GAME_ADDRESS, GameABI } from './config'
import Board from './components/Board'
import GameLobby from './components/GameLobby'
import GameInfo from './components/GameInfo'
import EventFeed from './components/EventFeed'

const publicClient = createPublicClient({ chain: somniaTestnet, transport: http() })

type GameData = {
  player1: Address; player2: Address; currentTurn: number
  status: number; stake: bigint; winner: Address; prizePaid: boolean; moveCount: number
}

export default function App() {
  const [address, setAddress] = useState<Address | null>(null)
  const [balance, setBalance] = useState('0')
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null)
  const [wsClient, setWsClient] = useState<PublicClient | null>(null)
  const wsInit = useRef(false)

  const [selectedGame, setSelectedGame] = useState<bigint | null>(null)
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [board, setBoard] = useState<number[][]>([])
  const [dropping, setDropping] = useState(false)
  const [lastEvent, setLastEvent] = useState<string | null>(null)

  // Init WS
  useEffect(() => {
    if (wsInit.current) return
    wsInit.current = true
    try {
      setWsClient(createPublicClient({
        chain: somniaTestnet,
        transport: webSocket('wss://api.infra.testnet.somnia.network/ws'),
      }))
    } catch { /* fallback */ }
  }, [])

  const connect = useCallback(async () => {
    if (!(window as any).ethereum) { alert('Install MetaMask!'); return }
    try {
      const wc = createWalletClient({ chain: somniaTestnet, transport: custom((window as any).ethereum) })
      const [addr] = await wc.requestAddresses()
      setAddress(addr)
      setWalletClient(wc)
    } catch (e: any) { alert(e.shortMessage || e.message) }
  }, [])

  // Balance
  useEffect(() => {
    if (!address) return
    const r = async () => {
      try { setBalance(formatEther(await publicClient.getBalance({ address }))) } catch {}
    }
    r(); const iv = setInterval(r, 10000); return () => clearInterval(iv)
  }, [address])

  // Load game state from chain
  const loadGame = useCallback(async () => {
    if (selectedGame === null) return
    try {
      const g = await publicClient.readContract({
        address: GAME_ADDRESS, abi: GameABI, functionName: 'getGame', args: [selectedGame],
      }) as [Address, Address, number, number, bigint, Address, boolean, number]
      setGameData({
        player1: g[0], player2: g[1], currentTurn: Number(g[2]),
        status: Number(g[3]), stake: g[4], winner: g[5], prizePaid: g[6], moveCount: Number(g[7]),
      })
      const raw = await publicClient.readContract({
        address: GAME_ADDRESS, abi: GameABI, functionName: 'getBoard', args: [selectedGame],
      }) as any
      const b: number[][] = []
      for (let r = 0; r < 6; r++) { b[r] = []; for (let c = 0; c < 7; c++) b[r][c] = Number(raw[r][c]) }
      setBoard(b)
    } catch {}
  }, [selectedGame])

  // Initial load when game is selected
  useEffect(() => { loadGame() }, [loadGame])

  // ─── REAL-TIME: Watch game events via WebSocket ───────────
  // Instead of polling, we listen for on-chain events and update instantly
  useEffect(() => {
    if (!wsClient || selectedGame === null) return

    const unwatch = wsClient.watchContractEvent({
      address: GAME_ADDRESS,
      abi: GameABI,
      onLogs: (logs) => {
        for (const log of logs) {
          const args = log.args as any

          // Only process events for our selected game
          const eventGameId = args.gameId !== undefined ? BigInt(args.gameId) : null
          if (eventGameId === null || eventGameId !== selectedGame) continue

          switch (log.eventName) {
            case 'MovePlayed': {
              // Opponent's move arrives in real-time!
              const col = Number(args.column)
              const row = Number(args.row)
              const playerAddr = (args.player as string).toLowerCase()

              // Determine which player number (1 or 2)
              setGameData(prev => {
                if (!prev) return prev
                const playerNum = playerAddr === prev.player1.toLowerCase() ? 1 : 2

                // Update board instantly from event data — no RPC call needed
                setBoard(prevBoard => {
                  const newBoard = prevBoard.map(r => [...r])
                  newBoard[row][col] = playerNum
                  return newBoard
                })

                // Switch turn
                const nextTurn = prev.currentTurn === 1 ? 2 : 1
                setLastEvent(`${playerNum === 1 ? 'Red' : 'Yellow'} played column ${col}`)
                return { ...prev, currentTurn: nextTurn, moveCount: prev.moveCount + 1 }
              })
              break
            }

            case 'GameStarted': {
              // Player 2 joined — refresh full state
              setLastEvent('Opponent joined! Game started.')
              loadGame()
              break
            }

            case 'GameWon': {
              const winnerAddr = (args.winner as string)
              setGameData(prev => prev ? { ...prev, status: 2, winner: winnerAddr as Address } : prev)
              setLastEvent(`Game over! Winner: ${winnerAddr.slice(0, 8)}...`)
              // Refresh to get prizePaid status
              setTimeout(loadGame, 3000)
              break
            }

            case 'GameDraw': {
              setGameData(prev => prev ? { ...prev, status: 3 } : prev)
              setLastEvent('Game over — Draw!')
              setTimeout(loadGame, 3000)
              break
            }

            case 'PrizeDistributed': {
              setLastEvent(`Prize paid: ${formatEther(args.amount)} STT`)
              setGameData(prev => prev ? { ...prev, prizePaid: true } : prev)
              break
            }
          }
        }
      },
      onError: (e) => console.error('Watch error:', e),
    })

    return () => unwatch()
  }, [wsClient, selectedGame, loadGame])

  // Slow fallback poll (every 15s) for missed events
  useEffect(() => {
    if (selectedGame === null) return
    const iv = setInterval(loadGame, 15000)
    return () => clearInterval(iv)
  }, [selectedGame, loadGame])

  const myPlayer = gameData && address
    ? gameData.player1.toLowerCase() === address.toLowerCase() ? 1
    : gameData.player2.toLowerCase() === address.toLowerCase() ? 2 : 0
    : 0

  const isMyTurn = gameData?.status === 1 && gameData.currentTurn === myPlayer

  const dropPiece = async (col: number) => {
    if (!walletClient || !address || selectedGame === null || dropping) return
    setDropping(true)
    try {
      const hash = await walletClient.writeContract({
        address: GAME_ADDRESS, abi: GameABI, chain: walletClient.chain,
        account: address, functionName: 'playMove', args: [selectedGame, col],
      })
      await publicClient.waitForTransactionReceipt({ hash })
      // Board will update via WebSocket event — no manual loadGame needed
    } catch (e: any) {
      alert(e.shortMessage || e.message)
    } finally {
      setDropping(false)
    }
  }

  return (
    <div className="app">
      <header>
        <div className="logo">
          <span className="logo-icon">&#9679;&#9679;&#9679;&#9679;</span>
          <div>
            <h1>Connect Four</h1>
            <p className="subtitle">On-chain game powered by Somnia Reactivity</p>
          </div>
        </div>
        {address ? (
          <div className="wallet-info">
            <span className="balance">{parseFloat(balance).toFixed(2)} STT</span>
            <span className="addr">{address.slice(0, 6)}...{address.slice(-4)}</span>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={connect}>Connect Wallet</button>
        )}
      </header>

      {!address ? (
        <div className="hero">
          <h2>Fully On-Chain Connect Four</h2>
          <p>Create a game, stake STT, play turns. Opponent moves appear instantly via real-time events. Somnia Reactivity auto-detects wins and distributes prizes.</p>
          <button className="btn btn-primary btn-large" onClick={connect}>Connect Wallet</button>
        </div>
      ) : (
        <div className="main-layout">
          <aside className="sidebar">
            <GameLobby
              address={address}
              walletClient={walletClient!}
              publicClient={publicClient}
              onSelectGame={setSelectedGame}
              selectedGame={selectedGame}
            />
            <EventFeed wsClient={wsClient} />
          </aside>
          <main className="game-area">
            {selectedGame !== null && gameData ? (
              <>
                <GameInfo
                  gameId={selectedGame}
                  player1={gameData.player1}
                  player2={gameData.player2}
                  currentTurn={gameData.currentTurn}
                  status={gameData.status}
                  stake={gameData.stake}
                  winner={gameData.winner}
                  prizePaid={gameData.prizePaid}
                  myPlayer={myPlayer}
                />
                <Board
                  board={board}
                  currentTurn={gameData.currentTurn}
                  myPlayer={myPlayer}
                  isMyTurn={isMyTurn}
                  gameActive={gameData.status === 1}
                  onDrop={dropPiece}
                />
                {dropping && <div className="status loading">Submitting move on-chain...</div>}
                {lastEvent && (
                  <div className="status event-toast">
                    <span className="toast-dot" /> {lastEvent}
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <p>Select or create a game from the sidebar</p>
              </div>
            )}
          </main>
        </div>
      )}

      <footer>
        <p>Somnia Reactivity Example &bull; <a href="https://docs.somnia.network/developer/reactivity" target="_blank" rel="noreferrer">Docs</a></p>
      </footer>
    </div>
  )
}

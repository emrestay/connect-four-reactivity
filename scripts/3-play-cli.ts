/**
 * CLI demo: create a game, join, play moves, watch Reactivity auto-finalize.
 * Uses a single wallet for both players (demo purposes).
 */
import { parseEther, formatEther } from 'viem'
import { publicClient, walletClient, account, GameABI, env, sleep, fmt } from './config.js'

const GAME = env('GAME_CONTRACT') as `0x${string}`

function printBoard(board: number[][]) {
  console.log('\n    0   1   2   3   4   5   6')
  console.log('  +---+---+---+---+---+---+---+')
  for (let r = 5; r >= 0; r--) {
    let row = '  |'
    for (let c = 0; c < 7; c++) {
      const v = board[r][c]
      row += v === 1 ? ' X |' : v === 2 ? ' O |' : '   |'
    }
    console.log(row)
    console.log('  +---+---+---+---+---+---+---+')
  }
  console.log()
}

async function getBoard(gameId: bigint): Promise<number[][]> {
  const raw = await publicClient.readContract({
    address: GAME, abi: GameABI, functionName: 'getBoard', args: [gameId],
  }) as any
  // Convert to plain array
  const board: number[][] = []
  for (let r = 0; r < 6; r++) {
    board[r] = []
    for (let c = 0; c < 7; c++) {
      board[r][c] = Number(raw[r][c])
    }
  }
  return board
}

async function move(gameId: bigint, col: number) {
  const hash = await walletClient.writeContract({
    address: GAME, abi: GameABI,
    functionName: 'playMove', args: [gameId, col],
  })
  await publicClient.waitForTransactionReceipt({ hash })
}

async function main() {
  console.log('\n--- Connect Four CLI Demo ---\n')
  const bal = await publicClient.getBalance({ address: account.address })
  console.log(`  Player: ${account.address}`)
  console.log(`  Balance: ${fmt(bal)}\n`)

  // 1. Create game
  console.log('1. Creating game (stake: 0.05 STT)...')
  const createHash = await walletClient.writeContract({
    address: GAME, abi: GameABI,
    functionName: 'createGame',
    value: parseEther('0.05'),
  })
  const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash })
  const gameId = BigInt(createReceipt.logs[0].topics[1]!)
  console.log(`   Game #${gameId} created\n`)

  // 2. Join game (same wallet for demo)
  console.log('2. Joining game...')
  await publicClient.waitForTransactionReceipt({
    hash: await walletClient.writeContract({
      address: GAME, abi: GameABI,
      functionName: 'joinGame', args: [gameId],
      value: parseEther('0.05'),
    })
  })
  console.log('   Joined! Game started.\n')

  // 3. Play a quick winning sequence for Player 1 (X)
  // X plays columns 0,0,0,0 — vertical win
  const moves = [
    { col: 0, label: 'X plays col 0' },
    { col: 1, label: 'O plays col 1' },
    { col: 0, label: 'X plays col 0' },
    { col: 1, label: 'O plays col 1' },
    { col: 0, label: 'X plays col 0' },
    { col: 1, label: 'O plays col 1' },
    { col: 0, label: 'X plays col 0 — should win!' },
  ]

  console.log('3. Playing moves...\n')
  for (const m of moves) {
    console.log(`   ${m.label}`)
    await move(gameId, m.col)
    const board = await getBoard(gameId)
    printBoard(board)
  }

  // 4. Wait for Reactivity auto-finalize
  console.log('4. Waiting for Reactivity to detect win and distribute prize...\n')
  for (let i = 1; i <= 10; i++) {
    await sleep(2000)
    const g = await publicClient.readContract({
      address: GAME, abi: GameABI, functionName: 'getGame', args: [gameId],
    }) as any[]
    const status = Number(g[3])
    const prizePaid = g[6] as boolean

    if (status === 2) { // Won
      console.log(`   WIN detected! Winner: ${g[5]}`)
      if (prizePaid) {
        console.log(`   Prize distributed automatically!\n`)
        const balAfter = await publicClient.getBalance({ address: account.address })
        console.log(`   Final balance: ${fmt(balAfter)}`)
        return
      }
    }
    process.stdout.write(`   [${i * 2}s] status=${status} prizePaid=${prizePaid}\n`)
  }
  console.log('\n   Timed out. Try: npm run play again or check subscription.')
}

main().catch(console.error)

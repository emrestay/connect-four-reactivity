import { decodeEventLog, formatEther } from 'viem'
import { offchainSDK, GameABI, env, sleep } from './config.js'
import type { SubscriptionCallback } from '@somnia-chain/reactivity'

async function main() {
  const gameAddr = env('GAME_CONTRACT') as `0x${string}`

  console.log('\n--- Connect Four Live Watcher ---')
  console.log(`  Contract: ${gameAddr}\n`)

  const subscription = await offchainSDK.subscribe({
    ethCalls: [],
    eventContractSources: [gameAddr],
    onData: (data: SubscriptionCallback) => {
      try {
        const decoded = decodeEventLog({
          abi: GameABI,
          topics: data.result.topics as [`0x${string}`, ...`0x${string}`[]],
          data: data.result.data,
        })
        const ts = new Date().toLocaleTimeString()
        const args = decoded.args as any

        switch (decoded.eventName) {
          case 'GameCreated':
            console.log(`  [${ts}] GAME_CREATED    #${args.gameId} stake=${formatEther(args.stake)} STT by ${(args.player1 as string).slice(0, 10)}...`)
            break
          case 'GameStarted':
            console.log(`  [${ts}] GAME_STARTED    #${args.gameId} player2=${(args.player2 as string).slice(0, 10)}...`)
            break
          case 'MovePlayed':
            console.log(`  [${ts}] MOVE_PLAYED     #${args.gameId} col=${args.column} row=${args.row} by ${(args.player as string).slice(0, 10)}...`)
            break
          case 'GameWon':
            console.log(`  [${ts}] GAME_WON        #${args.gameId} winner=${(args.winner as string).slice(0, 10)}...`)
            break
          case 'GameDraw':
            console.log(`  [${ts}] GAME_DRAW       #${args.gameId}`)
            break
          case 'PrizeDistributed':
            console.log(`  [${ts}] PRIZE_SENT      #${args.gameId} ${formatEther(args.amount)} STT -> ${(args.recipient as string).slice(0, 10)}...`)
            break
        }
      } catch { /* skip */ }
    },
    onError: (err: Error) => console.error('  Error:', err.message),
  })

  console.log('  Listening... (Ctrl+C to stop)\n')
  await sleep(600_000)
  subscription.unsubscribe()
}

main().catch(console.error)

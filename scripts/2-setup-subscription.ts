import { keccak256, toHex, parseGwei } from 'viem'
import { onchainSDK, env } from './config.js'

async function main() {
  console.log('\n--- Setup Reactivity Subscription ---\n')

  const gameAddr    = env('GAME_CONTRACT')    as `0x${string}`
  const handlerAddr = env('HANDLER_CONTRACT') as `0x${string}`

  // MovePlayed(uint256 indexed gameId, address indexed player, uint8 column, uint8 row)
  const movePlayedTopic = keccak256(toHex('MovePlayed(uint256,address,uint8,uint8)'))

  console.log(`  Game:    ${gameAddr}`)
  console.log(`  Handler: ${handlerAddr}`)
  console.log(`  Topic:   ${movePlayedTopic}\n`)

  const txHash = await onchainSDK.createSoliditySubscription({
    handlerContractAddress: handlerAddr,
    emitter: gameAddr,
    eventTopics: [movePlayedTopic],
    priorityFeePerGas: parseGwei('2'),
    maxFeePerGas: parseGwei('10'),
    gasLimit: 3_000_000n,
    isGuaranteed: true,
    isCoalesced: false,
  })

  if (txHash instanceof Error) {
    console.error('Failed:', txHash.message)
    return
  }

  console.log('Subscription created!')
  console.log(`  Tx: ${txHash}`)
  console.log('\nFlow: playMove() -> MovePlayed event -> GameHandler -> checkAndFinalize()')
  console.log('      If win/draw detected -> prize distributed automatically')
  console.log('\nNext: npm run play   (CLI demo)')
  console.log('      cd frontend && npm run dev  (web UI)')
}

main().catch(console.error)

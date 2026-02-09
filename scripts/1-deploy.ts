import { publicClient, walletClient, account, loadArtifact, fmt } from './config.js'

async function main() {
  console.log('\n--- Deploy Connect Four ---\n')
  console.log(`  Deployer: ${account.address}`)
  const bal = await publicClient.getBalance({ address: account.address })
  console.log(`  Balance:  ${fmt(bal)}\n`)

  console.log('Deploying ConnectFour...')
  const gameArt = loadArtifact('ConnectFour')
  const gameHash = await walletClient.deployContract({
    abi: gameArt.abi, bytecode: gameArt.bytecode as `0x${string}`,
  })
  const gameReceipt = await publicClient.waitForTransactionReceipt({ hash: gameHash })
  const gameAddr = gameReceipt.contractAddress!
  console.log(`  ConnectFour: ${gameAddr}`)

  console.log('\nDeploying GameHandler...')
  const handlerArt = loadArtifact('GameHandler')
  const handlerHash = await walletClient.deployContract({
    abi: handlerArt.abi, bytecode: handlerArt.bytecode as `0x${string}`,
    args: [gameAddr],
  })
  const handlerReceipt = await publicClient.waitForTransactionReceipt({ hash: handlerHash })
  const handlerAddr = handlerReceipt.contractAddress!
  console.log(`  GameHandler: ${handlerAddr}`)

  console.log('\n--- Add to .env ---\n')
  console.log(`GAME_CONTRACT=${gameAddr}`)
  console.log(`HANDLER_CONTRACT=${handlerAddr}`)
  console.log('\nNext: npm run setup')
}

main().catch(console.error)

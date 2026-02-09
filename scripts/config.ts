import 'dotenv/config'
import {
  createPublicClient, createWalletClient, http, webSocket,
  defineChain, parseAbi, type Address,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { SDK } from '@somnia-chain/reactivity'
import { readFileSync } from 'fs'

// ─── Chain ──────────────────────────────────────────────────
export const somniaTestnet = defineChain({
  id: 50312,
  name: 'Somnia Testnet',
  network: 'somnia-testnet',
  nativeCurrency: { decimals: 18, name: 'STT', symbol: 'STT' },
  rpcUrls: {
    default: {
      http: ['https://dream-rpc.somnia.network'],
      webSocket: ['wss://api.infra.testnet.somnia.network/ws'],
    },
    public: {
      http: ['https://dream-rpc.somnia.network'],
      webSocket: ['wss://api.infra.testnet.somnia.network/ws'],
    },
  },
})

// ─── Account ────────────────────────────────────────────────
const pk = process.env.PRIVATE_KEY as `0x${string}`
export const account = privateKeyToAccount(pk)

// ─── Clients ────────────────────────────────────────────────
export const publicClient = createPublicClient({ chain: somniaTestnet, transport: http() })
export const walletClient = createWalletClient({ account, chain: somniaTestnet, transport: http() })
export const wsClient = createPublicClient({ chain: somniaTestnet, transport: webSocket() })

// ─── SDKs ───────────────────────────────────────────────────
export const onchainSDK = new SDK({ public: publicClient, wallet: walletClient })
export const offchainSDK = new SDK({ public: wsClient })

// ─── ABI ────────────────────────────────────────────────────
export const GameABI = parseAbi([
  'function createGame() payable returns (uint256)',
  'function joinGame(uint256 gameId) payable',
  'function playMove(uint256 gameId, uint8 column)',
  'function checkAndFinalize(uint256 gameId)',
  'function distributePrize(uint256 gameId)',
  'function getGame(uint256 gameId) view returns (address, address, uint8, uint8, uint256, address, bool, uint8)',
  'function getBoard(uint256 gameId) view returns (uint8[7][6])',
  'function nextGameId() view returns (uint256)',
  'event GameCreated(uint256 indexed gameId, address indexed player1, uint256 stake)',
  'event GameStarted(uint256 indexed gameId, address indexed player2)',
  'event MovePlayed(uint256 indexed gameId, address indexed player, uint8 column, uint8 row)',
  'event GameWon(uint256 indexed gameId, address indexed winner)',
  'event GameDraw(uint256 indexed gameId)',
  'event PrizeDistributed(uint256 indexed gameId, address indexed recipient, uint256 amount)',
])

// ─── Helpers ────────────────────────────────────────────────
export function loadArtifact(name: string) {
  return JSON.parse(readFileSync(`./artifacts/contracts/${name}.sol/${name}.json`, 'utf-8'))
}
export function env(key: string): string {
  const v = process.env[key]
  if (!v) throw new Error(`${key} not set in .env`)
  return v
}
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
export const fmt = (wei: bigint) => `${(Number(wei) / 1e18).toFixed(4)} STT`

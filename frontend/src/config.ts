import { defineChain, parseAbi } from 'viem'

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

// Update after deployment
export const GAME_ADDRESS = '0x670182ee19cec4371df602c5925172cde4d2d872' as const

export const GameABI = parseAbi([
  'function createGame() payable returns (uint256)',
  'function joinGame(uint256 gameId) payable',
  'function playMove(uint256 gameId, uint8 column)',
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

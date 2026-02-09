# Connect Four — On-Chain Game with Somnia Reactivity

Fully on-chain Connect Four with real-time moves and automatic prize distribution, powered by **Somnia Reactivity**.

## How It Works

```
Player A calls playMove(col)
        |
        v
ConnectFour emits MovePlayed event
        |
        +---> Player B's UI updates instantly (WebSocket event)
        |
        v  (Somnia Reactivity subscription)
Validator invokes GameHandler._onEvent()
        |
        v
GameHandler calls checkAndFinalize(gameId)
        |
        v  (if 4 in a row or board full)
ConnectFour distributes prize to winner automatically
```

**Reactivity is used for:**
- **Win/draw detection** after every move (on-chain handler)
- **Automatic prize distribution** — no manual claims needed
- **Real-time board updates** — opponent's moves appear instantly via WebSocket events

## Contracts

| Contract | Role |
|---|---|
| `ConnectFour.sol` | Game logic: create, join, play moves, check win, distribute prize |
| `GameHandler.sol` | Reactivity handler: after each move, checks for win/draw and triggers payout |

## Quick Start

### Prerequisites

- Node.js 20+
- MetaMask with Somnia Testnet (Chain ID: 50312, RPC: `https://dream-rpc.somnia.network`)
- 32+ STT for on-chain subscription ([faucet](https://docs.somnia.network/developer/network-info))

### 1. Install & Compile

```bash
npm install && npm run compile
cd frontend && npm install && cd ..
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env with your private key
```

### 3. Deploy

```bash
npm run deploy
```

Update `.env` and `frontend/src/config.ts` with the printed contract addresses.

### 4. Setup Reactivity Subscription

```bash
npm run setup
```

Creates an on-chain subscription: `MovePlayed` -> `GameHandler` -> `checkAndFinalize()` -> auto prize.

### 5. Play

**Web UI:**
```bash
cd frontend && npm run dev
```

**CLI demo:**
```bash
npm run watch   # Terminal 1: live events
npm run play    # Terminal 2: play a demo game
```

## Key Design Decisions

- **gasLimit: 3,000,000** — Somnia prague EVM requires higher gas for cross-contract calls
- **try/catch in handler** — prevents infinite retry loops if `checkAndFinalize` reverts
- **Real-time board via WebSocket** — `MovePlayed` events update the opponent's board instantly, no polling
- **Fallback polling** — slow 15s poll as safety net if WebSocket drops

## Deployed Contracts (Somnia Testnet)

| Contract | Address |
|---|---|
| ConnectFour | `0x670182ee19cec4371df602c5925172cde4d2d872` |
| GameHandler | `0xd10aeabb8a685d5fa637820570bf57faa6c1b8a8` |

## Project Structure

```
connect-four/
  contracts/
    ConnectFour.sol          # Game logic + win detection
    GameHandler.sol          # Reactivity event handler
  scripts/
    1-deploy.ts              # Deploy both contracts
    2-setup-subscription.ts  # On-chain Reactivity subscription
    3-play-cli.ts            # CLI demo game
    4-watch.ts               # Live event watcher
  frontend/
    src/
      App.tsx                # Real-time game state via WebSocket events
      components/
        Board.tsx            # 7x6 game board
        GameLobby.tsx        # Create/join games
        GameInfo.tsx         # Players, turn, status
        EventFeed.tsx        # Live event stream
```

## Links

- [Somnia Reactivity Docs](https://docs.somnia.network/developer/reactivity)
- [Somnia Testnet Explorer](https://somnia-testnet.socialscan.io)

// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title ConnectFour
/// @notice Fully on-chain Connect Four with staking — Somnia Reactivity example.
///         Players call playMove(); Reactivity handles win detection + prize payout.
contract ConnectFour {

    // ──────────────────────── Constants ────────────────────────
    uint8 constant ROWS = 6;
    uint8 constant COLS = 7;

    enum Status { WaitingForPlayer, InProgress, Won, Draw }

    struct Game {
        address player1;
        address player2;
        uint8[COLS][ROWS] board;   // board[row][col]: 0=empty, 1=p1, 2=p2
        uint8   moveCount;
        uint8   currentTurn;       // 1 or 2
        Status  status;
        uint256 stake;             // per player
        address winner;
        bool    prizePaid;
    }

    // ──────────────────────── State ───────────────────────────
    uint256 public nextGameId;
    mapping(uint256 => Game) games;

    // ──────────────────────── Events ──────────────────────────
    event GameCreated(uint256 indexed gameId, address indexed player1, uint256 stake);
    event GameStarted(uint256 indexed gameId, address indexed player2);
    event MovePlayed(uint256 indexed gameId, address indexed player, uint8 column, uint8 row);
    event GameWon(uint256 indexed gameId, address indexed winner);
    event GameDraw(uint256 indexed gameId);
    event PrizeDistributed(uint256 indexed gameId, address indexed recipient, uint256 amount);

    // ──────────────────────── Game Lifecycle ──────────────────

    /// @notice Create a new game and stake STT
    function createGame() external payable returns (uint256 gameId) {
        require(msg.value > 0, "Must stake STT");
        gameId = nextGameId++;
        Game storage g = games[gameId];
        g.player1 = msg.sender;
        g.stake = msg.value;
        g.currentTurn = 1;
        g.status = Status.WaitingForPlayer;
        emit GameCreated(gameId, msg.sender, msg.value);
    }

    /// @notice Join an existing game with equal stake
    function joinGame(uint256 gameId) external payable {
        Game storage g = games[gameId];
        require(g.status == Status.WaitingForPlayer, "Game not joinable");
        // In production, uncomment: require(msg.sender != g.player1, "Cannot join own game");
        require(msg.value == g.stake, "Must match stake");
        g.player2 = msg.sender;
        g.status = Status.InProgress;
        emit GameStarted(gameId, msg.sender);
    }

    /// @notice Drop a piece into a column (0-6)
    function playMove(uint256 gameId, uint8 column) external {
        Game storage g = games[gameId];
        require(g.status == Status.InProgress, "Game not in progress");
        require(column < COLS, "Invalid column");

        // Verify turn
        address currentPlayer = g.currentTurn == 1 ? g.player1 : g.player2;
        require(msg.sender == currentPlayer, "Not your turn");

        // Find lowest empty row in column
        uint8 row = _findRow(g, column);
        require(row < ROWS, "Column full");

        // Place piece
        g.board[row][column] = g.currentTurn;
        g.moveCount++;

        emit MovePlayed(gameId, msg.sender, column, row);

        // Switch turn
        g.currentTurn = g.currentTurn == 1 ? 2 : 1;
    }

    /// @notice Check for win/draw and finalize. Called by GameHandler via Reactivity.
    function checkAndFinalize(uint256 gameId) external {
        Game storage g = games[gameId];
        if (g.status != Status.InProgress) return;

        // Check win for both players
        for (uint8 p = 1; p <= 2; p++) {
            if (_checkWin(g, p)) {
                g.status = Status.Won;
                g.winner = p == 1 ? g.player1 : g.player2;
                emit GameWon(gameId, g.winner);
                _distributePrize(gameId);
                return;
            }
        }

        // Check draw (board full)
        if (g.moveCount >= ROWS * COLS) {
            g.status = Status.Draw;
            emit GameDraw(gameId);
            _distributePrize(gameId);
        }
    }

    // ──────────────────────── Prize ──────────────────────────

    function _distributePrize(uint256 gameId) internal {
        Game storage g = games[gameId];
        if (g.prizePaid) return;
        g.prizePaid = true;

        uint256 pool = g.stake * 2;

        if (g.status == Status.Won) {
            (bool ok, ) = g.winner.call{value: pool}("");
            if (ok) emit PrizeDistributed(gameId, g.winner, pool);
        } else if (g.status == Status.Draw) {
            // Refund both players
            (bool ok1, ) = g.player1.call{value: g.stake}("");
            if (ok1) emit PrizeDistributed(gameId, g.player1, g.stake);
            (bool ok2, ) = g.player2.call{value: g.stake}("");
            if (ok2) emit PrizeDistributed(gameId, g.player2, g.stake);
        }
    }

    /// @notice Manual fallback if Reactivity handler doesn't trigger
    function distributePrize(uint256 gameId) external {
        Game storage g = games[gameId];
        require(g.status == Status.Won || g.status == Status.Draw, "Game not finished");
        _distributePrize(gameId);
    }

    // ──────────────────────── Win Detection ──────────────────

    function _checkWin(Game storage g, uint8 player) internal view returns (bool) {
        // Horizontal
        for (uint8 r = 0; r < ROWS; r++) {
            for (uint8 c = 0; c + 3 < COLS; c++) {
                if (g.board[r][c] == player &&
                    g.board[r][c+1] == player &&
                    g.board[r][c+2] == player &&
                    g.board[r][c+3] == player) return true;
            }
        }
        // Vertical
        for (uint8 r = 0; r + 3 < ROWS; r++) {
            for (uint8 c = 0; c < COLS; c++) {
                if (g.board[r][c] == player &&
                    g.board[r+1][c] == player &&
                    g.board[r+2][c] == player &&
                    g.board[r+3][c] == player) return true;
            }
        }
        // Diagonal ↘
        for (uint8 r = 0; r + 3 < ROWS; r++) {
            for (uint8 c = 0; c + 3 < COLS; c++) {
                if (g.board[r][c] == player &&
                    g.board[r+1][c+1] == player &&
                    g.board[r+2][c+2] == player &&
                    g.board[r+3][c+3] == player) return true;
            }
        }
        // Diagonal ↗
        for (uint8 r = 3; r < ROWS; r++) {
            for (uint8 c = 0; c + 3 < COLS; c++) {
                if (g.board[r][c] == player &&
                    g.board[r-1][c+1] == player &&
                    g.board[r-2][c+2] == player &&
                    g.board[r-3][c+3] == player) return true;
            }
        }
        return false;
    }

    function _findRow(Game storage g, uint8 col) internal view returns (uint8) {
        for (uint8 r = 0; r < ROWS; r++) {
            if (g.board[r][col] == 0) return r;
        }
        return ROWS; // Column full
    }

    // ──────────────────────── Views ──────────────────────────

    function getGame(uint256 gameId) external view returns (
        address player1, address player2,
        uint8 currentTurn, Status status,
        uint256 stake, address winner,
        bool prizePaid, uint8 moveCount
    ) {
        Game storage g = games[gameId];
        return (g.player1, g.player2, g.currentTurn, g.status, g.stake, g.winner, g.prizePaid, g.moveCount);
    }

    function getBoard(uint256 gameId) external view returns (uint8[COLS][ROWS] memory) {
        return games[gameId].board;
    }
}

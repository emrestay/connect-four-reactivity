// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { SomniaEventHandler } from "@somnia-chain/reactivity-contracts/contracts/SomniaEventHandler.sol";

/// @title GameHandler
/// @notice Somnia Reactivity handler for Connect Four.
///         Subscribed to MovePlayed events — after every move, checks for
///         win/draw and distributes the prize automatically.
/// @dev    All external calls wrapped in try/catch to prevent infinite retries.

interface IConnectFour {
    function checkAndFinalize(uint256 gameId) external;
}

contract GameHandler is SomniaEventHandler {

    IConnectFour public immutable game;

    event TurnProcessed(uint256 indexed gameId, bool success);

    constructor(address _game) {
        game = IConnectFour(_game);
    }

    /// @dev Called by Somnia validators when MovePlayed is emitted.
    ///      topics[0] = MovePlayed selector
    ///      topics[1] = gameId (indexed)
    ///      topics[2] = player (indexed)
    function _onEvent(
        address /* emitter */,
        bytes32[] calldata eventTopics,
        bytes calldata /* data */
    ) internal override {
        uint256 gameId = uint256(eventTopics[1]);

        // try/catch: if checkAndFinalize reverts, we don't retry endlessly
        try game.checkAndFinalize(gameId) {
            emit TurnProcessed(gameId, true);
        } catch {
            emit TurnProcessed(gameId, false);
        }
    }
}

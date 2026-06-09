// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title ISnapshot
/// @notice Interface required by the CRE Developer Expert assignment. It declares the
///         `Record` struct and the `snapshot` function signature.
interface ISnapshot {
    struct Record {
        string token;
        uint256 price;
        uint256 blockNumber;
        uint256 timestamp;
    }

    /// @notice Records a price snapshot produced by the CRE workflow.
    /// @dev Authorized callers only (the CRE Forwarder). See {Snapshot}.
    function snapshot(Record calldata record) external;
}

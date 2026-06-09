// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC165} from "./IERC165.sol";

/// @title IReceiver - receives Chainlink CRE / Keystone reports
/// @notice The CRE `KeystoneForwarder` calls `onReport` on contracts that implement this
///         interface. Implementations must advertise support through ERC-165.
interface IReceiver is IERC165 {
    /// @notice Handles an incoming CRE report.
    /// @dev Called by the Forwarder. If this reverts, the Forwarder marks delivery as failed.
    /// @param metadata Report metadata: abi.encodePacked(workflowId, workflowName, workflowOwner, ...).
    /// @param report   The ABI-encoded workflow payload.
    function onReport(bytes calldata metadata, bytes calldata report) external;
}

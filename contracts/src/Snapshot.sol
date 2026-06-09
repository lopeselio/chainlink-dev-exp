// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ISnapshot} from "./ISnapshot.sol";
import {IReceiver} from "./keystone/IReceiver.sol";
import {IERC165} from "./keystone/IERC165.sol";

/// @title Snapshot
/// @notice Receives Chainlink Data Feed price snapshots from a CRE workflow and stores them
///         on-chain. The workflow reads a feed via the EVM Read capability and writes the
///         result here via the EVM Write capability, which is delivered by the CRE Forwarder.
/// @dev Security model:
///      1. `i_forwarder` is immutable and set at construction. Only the Forwarder can deliver
///         reports (`onReport`) or call `snapshot` directly. This is the *forwarder check*.
///      2. Optionally, an `expectedWorkflowOwner` can be configured by the contract owner so
///         that only reports authored by a specific workflow owner are accepted (defense in
///         depth). It is disabled (address(0)) by default so simulations work out of the box.
contract Snapshot is ISnapshot, IReceiver {
    /// @notice The CRE KeystoneForwarder allowed to deliver reports. Immutable for safety.
    address public immutable i_forwarder;

    /// @notice Contract owner (can configure the optional workflow-owner check).
    address public owner;

    /// @notice If non-zero, only reports authored by this workflow owner are accepted.
    address public expectedWorkflowOwner;

    /// @notice Most recent snapshot across all tokens.
    Record private s_latest;

    /// @notice Most recent snapshot per token symbol.
    mapping(string token => Record record) private s_latestByToken;

    /// @notice All token symbols ever recorded (for enumeration).
    string[] private s_tokens;

    event SnapshotRecorded(
        string indexed tokenHash, string token, uint256 price, uint256 blockNumber, uint256 timestamp
    );
    event ExpectedWorkflowOwnerUpdated(address indexed previous, address indexed current);

    error InvalidForwarder();
    error UnauthorizedForwarder(address caller, address expected);
    error UnauthorizedWorkflowOwner(address received, address expected);
    error NotOwner();

    /// @notice Restricts a call to the configured CRE Forwarder. This is the forwarder check.
    modifier onlyForwarder() {
        if (msg.sender != i_forwarder) revert UnauthorizedForwarder(msg.sender, i_forwarder);
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @param forwarder The CRE KeystoneForwarder address for the target chain. Cannot be zero.
    constructor(address forwarder) {
        if (forwarder == address(0)) revert InvalidForwarder();
        i_forwarder = forwarder;
        owner = msg.sender;
    }

    // ---------------------------------------------------------------------
    // CRE entrypoints
    // ---------------------------------------------------------------------

    /// @inheritdoc IReceiver
    /// @dev Invoked by the Forwarder. Enforces the forwarder check, optionally verifies the
    ///      workflow owner from `metadata`, then decodes the report into a {Record}.
    function onReport(bytes calldata metadata, bytes calldata report) external override onlyForwarder {
        if (expectedWorkflowOwner != address(0)) {
            address workflowOwner = _decodeWorkflowOwner(metadata);
            if (workflowOwner != expectedWorkflowOwner) {
                revert UnauthorizedWorkflowOwner(workflowOwner, expectedWorkflowOwner);
            }
        }
        _record(abi.decode(report, (Record)));
    }

    /// @inheritdoc ISnapshot
    /// @dev Named entrypoint required by the assignment. Also guarded by the forwarder check.
    function snapshot(Record calldata record) external override onlyForwarder {
        _record(record);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function latestSnapshot() external view returns (Record memory) {
        return s_latest;
    }

    function snapshotOf(string calldata token) external view returns (Record memory) {
        return s_latestByToken[token];
    }

    function tokens() external view returns (string[] memory) {
        return s_tokens;
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    function setExpectedWorkflowOwner(address workflowOwner) external onlyOwner {
        emit ExpectedWorkflowOwnerUpdated(expectedWorkflowOwner, workflowOwner);
        expectedWorkflowOwner = workflowOwner;
    }

    // ---------------------------------------------------------------------
    // ERC-165
    // ---------------------------------------------------------------------

    /// @inheritdoc IERC165
    /// @dev The Forwarder verifies receivers advertise {IReceiver} support.
    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IReceiver).interfaceId || interfaceId == type(IERC165).interfaceId;
    }

    // ---------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------

    function _record(Record memory record) internal {
        if (s_latestByToken[record.token].timestamp == 0) {
            s_tokens.push(record.token);
        }
        s_latest = record;
        s_latestByToken[record.token] = record;
        emit SnapshotRecorded(record.token, record.token, record.price, record.blockNumber, record.timestamp);
    }

    /// @dev CRE report metadata is `abi.encodePacked(workflowId(32), workflowName(10), workflowOwner(20), ...)`.
    ///      The dynamic `bytes` layout in memory places the length word first, so the owner sits
    ///      at offset 32 (length) + 32 (workflowId) + 10 (workflowName) = byte 74.
    function _decodeWorkflowOwner(bytes memory metadata) internal pure returns (address workflowOwner) {
        assembly {
            workflowOwner := shr(mul(12, 8), mload(add(metadata, 74)))
        }
    }
}

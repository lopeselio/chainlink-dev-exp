// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @dev Interface of the ERC-165 standard, as defined in
/// https://eips.ethereum.org/EIPS/eip-165[EIP-165].
/// Vendored locally so the contract has no external dependencies.
interface IERC165 {
    /// @notice Returns true if this contract implements the interface defined by `interfaceId`.
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

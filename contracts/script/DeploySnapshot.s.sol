// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console2} from "forge-std/Script.sol";
import {Snapshot} from "../src/Snapshot.sol";

/// @notice Deploys the {Snapshot} consumer to Ethereum Sepolia.
/// @dev Required env var:
///        FORWARDER_ADDRESS  - the CRE KeystoneForwarder address for Sepolia.
///      Run with:
///        forge script script/DeploySnapshot.s.sol:DeploySnapshot \
///          --rpc-url $SEPOLIA_RPC_URL --account <keystore> --broadcast --verify
contract DeploySnapshot is Script {
    function run() external returns (Snapshot snapshot) {
        address forwarder = vm.envAddress("FORWARDER_ADDRESS");
        require(forwarder != address(0), "FORWARDER_ADDRESS not set");

        vm.startBroadcast();
        snapshot = new Snapshot(forwarder);
        vm.stopBroadcast();

        console2.log("Snapshot deployed at:", address(snapshot));
        console2.log("Configured forwarder:", forwarder);
    }
}

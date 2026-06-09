// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {Snapshot} from "../src/Snapshot.sol";
import {ISnapshot} from "../src/ISnapshot.sol";
import {IReceiver} from "../src/keystone/IReceiver.sol";
import {IERC165} from "../src/keystone/IERC165.sol";

contract SnapshotTest is Test {
    Snapshot internal snap;

    address internal forwarder = makeAddr("forwarder");
    address internal attacker = makeAddr("attacker");
    address internal owner = address(this);

    function setUp() public {
        snap = new Snapshot(forwarder);
    }

    function _record(string memory token) internal pure returns (ISnapshot.Record memory) {
        return ISnapshot.Record({token: token, price: 167273784000, blockNumber: 11020111, timestamp: 1781009244});
    }

    function _metadata(address workflowOwner) internal pure returns (bytes memory) {
        // abi.encodePacked(workflowId(32), workflowName(10), workflowOwner(20))
        return abi.encodePacked(bytes32(uint256(1)), bytes10("snapshot"), workflowOwner);
    }

    function test_constructor_rejectsZeroForwarder() public {
        vm.expectRevert(Snapshot.InvalidForwarder.selector);
        new Snapshot(address(0));
    }

    function test_onReport_storesRecord_whenCalledByForwarder() public {
        ISnapshot.Record memory r = _record("ETH");
        vm.prank(forwarder);
        snap.onReport(_metadata(address(0)), abi.encode(r));

        ISnapshot.Record memory got = snap.snapshotOf("ETH");
        assertEq(got.token, "ETH");
        assertEq(got.price, r.price);
        assertEq(got.blockNumber, r.blockNumber);
        assertEq(got.timestamp, r.timestamp);
        assertEq(snap.tokens().length, 1);
    }

    function test_onReport_revertsForNonForwarder() public {
        ISnapshot.Record memory r = _record("ETH");
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(Snapshot.UnauthorizedForwarder.selector, attacker, forwarder));
        snap.onReport(_metadata(address(0)), abi.encode(r));
    }

    function test_snapshot_revertsForNonForwarder() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(Snapshot.UnauthorizedForwarder.selector, attacker, forwarder));
        snap.snapshot(_record("ETH"));
    }

    function test_snapshot_storesRecord_whenCalledByForwarder() public {
        vm.prank(forwarder);
        snap.snapshot(_record("BTC"));
        assertEq(snap.latestSnapshot().token, "BTC");
    }

    function test_expectedWorkflowOwner_enforced() public {
        address wfOwner = makeAddr("wfOwner");
        snap.setExpectedWorkflowOwner(wfOwner);

        // Wrong owner in metadata -> revert.
        vm.prank(forwarder);
        vm.expectRevert(abi.encodeWithSelector(Snapshot.UnauthorizedWorkflowOwner.selector, attacker, wfOwner));
        snap.onReport(_metadata(attacker), abi.encode(_record("ETH")));

        // Correct owner -> succeeds.
        vm.prank(forwarder);
        snap.onReport(_metadata(wfOwner), abi.encode(_record("ETH")));
        assertEq(snap.snapshotOf("ETH").price, 167273784000);
    }

    function test_setExpectedWorkflowOwner_onlyOwner() public {
        vm.prank(attacker);
        vm.expectRevert(Snapshot.NotOwner.selector);
        snap.setExpectedWorkflowOwner(attacker);
    }

    function test_supportsInterface() public view {
        assertTrue(snap.supportsInterface(type(IReceiver).interfaceId));
        assertTrue(snap.supportsInterface(type(IERC165).interfaceId));
        assertFalse(snap.supportsInterface(0xffffffff));
    }

    function test_latestTracksAcrossTokens() public {
        vm.startPrank(forwarder);
        snap.snapshot(_record("ETH"));
        snap.snapshot(_record("BTC"));
        vm.stopPrank();
        assertEq(snap.latestSnapshot().token, "BTC");
        assertEq(snap.tokens().length, 2);
    }
}

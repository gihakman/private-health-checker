// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

contract PrivateHealthChecker {
    uint64 public constant LIQUIDATION_THRESHOLD = 150;
    uint64 public constant SCALE = 100;

    mapping(address => ebool) public latestResult;

    event HealthChecked(address indexed user, ebool result);

    function checkHealth(
        InEuint64 calldata collateral,
        InEuint64 calldata debt
    ) external {
        euint64 eColl = FHE.asEuint64(collateral);
        euint64 eDebt = FHE.asEuint64(debt);

        // Avoid div-by-zero: if debt == 0, substitute 1 (result overridden below)
        ebool isDebtZero = FHE.eq(eDebt, FHE.asEuint64(0));
        euint64 safeDebt = FHE.select(isDebtZero, FHE.asEuint64(1), eDebt);

        // health = collateral * 100 / debt
        euint64 health = FHE.div(FHE.mul(eColl, FHE.asEuint64(SCALE)), safeDebt);

        // computedSafe = health >= 150
        ebool computedSafe = FHE.gte(health, FHE.asEuint64(LIQUIDATION_THRESHOLD));

        // If debt is zero, position is always safe (no debt = no liquidation risk)
        ebool isSafe = FHE.select(isDebtZero, FHE.asEbool(true), computedSafe);

        FHE.allowThis(isSafe);
        FHE.allowSender(isSafe);

        latestResult[msg.sender] = isSafe;

        emit HealthChecked(msg.sender, isSafe);
    }
}

// SPDX-License-Identifier: unlicensed
pragma solidity ^0.8.1;

import {LoanPool} from "./LoanPool.sol";

contract Treasury {
    LoanPool public loanContract;
    uint256 public totalInterest;
    mapping(address => uint256) interestBalance;

    constructor(address contractAdd) {
        loanContract = LoanPool(contractAdd);
    }

    function receiveInterest() public payable {
        require(msg.value > 0, "no amount received");
        totalInterest += msg.value;

        uint256 precision = 18;
        uint256 addrCount = loanContract.getFundersListTotal();

        for (uint256 i = 0; i < addrCount; i++) {
            address addr = loanContract.fundersArr(i);
            uint256 deposit = loanContract.funders(addr);
            uint256 totalDeposit = loanContract.totalFund();

            uint256 allocation = (((deposit * (10**precision)) / totalDeposit) *
                msg.value) / (10**precision);

            interestBalance[addr] += allocation;
        }
    }

    function getAllocation(address addr) public view returns (uint256) {
        return interestBalance[addr];
    }

    function claim() public payable returns (bool) {
        require(loanContract.funders(msg.sender) > 0, "not a depositor");
        require(interestBalance[msg.sender] > 0, "no interest earned");

        bool success;
        uint256 amount = interestBalance[msg.sender];
        interestBalance[msg.sender] = 0;
        totalInterest -= amount;

        payable(msg.sender).transfer(amount);

        return success = true;
    }
}

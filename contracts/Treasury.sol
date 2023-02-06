// SPDX-License-Identifier: unlicensed
pragma solidity ^0.8.18;

import {LoanPool} from "./LoanPool.sol";

contract Treasury {
    LoanPool public loanPool;
    address public admin;
    uint256 public totalInterest;
    uint256 public totalInterestEarned;
    uint256 public allocateInterval;
    mapping(address => uint256) public interestBalance;

    event InterestAllocated(address _funder, uint256 _allocation, uint256 _totalInterest);

    constructor(address contractAddr) {
        loanPool = LoanPool(contractAddr);
        admin = msg.sender;
        allocateInterval = 1 * 1e17; //default to 0.1 FIL
    }

    modifier onlyAdmin() {
        require (msg.sender == admin, "only admin");
        _;
    }

	function claim(uint256 amount) public payable {
        if (totalInterest > 0) allocateInterest();

		require(loanPool.funders(msg.sender) > 0, "not a depositor");
		require(interestBalance[msg.sender] > amount, "no interest earned");

		interestBalance[msg.sender] -= amount;
		payable(msg.sender).transfer(amount);
	}

	function claimAll() public payable {
        if (totalInterest > 0) allocateInterest();

		require(loanPool.funders(msg.sender) > 0, "not a depositor");
		require(interestBalance[msg.sender] > 0, "no interest earned");

		uint256 amount = interestBalance[msg.sender];
		interestBalance[msg.sender] = 0;
		payable(msg.sender).transfer(amount);
	}

    function allocateInterest() public {
        uint256 precision = 18;
        uint256 addrCount = loanPool.getFundersListTotal();

        for (uint256 i = 0; i < addrCount;) {
            address addr = loanPool.fundersArr(i);
            uint256 deposit = loanPool.funders(addr);
            uint256 totalDeposit = loanPool.totalFund();

            uint256 allocation = (((deposit * (10**precision)) / totalDeposit) *
                totalInterest) / (10**precision);
            interestBalance[addr] += allocation;

            emit InterestAllocated(addr, allocation, interestBalance[addr]);

            unchecked {
                i++;
            }
        }
        totalInterest = 0;
    }

    function setAllocateInterval(uint256 _allocateInterval) external onlyAdmin {
        allocateInterval = _allocateInterval;
    }

    function transferOwnership(address _admin) external onlyAdmin {
        require(_admin != address(0x0), "no zero address");
        admin = _admin;
    }

    function getFundersList() external view returns (address[] memory) {
        return loanPool.getFundersList();
    }

    function getAllocation(address addr) public view returns (uint256) {
        return interestBalance[addr];
    }

    function receiveInterest() public payable {
        require(msg.value > 0, "no amount received");
        totalInterest += msg.value; // for allocation
        totalInterestEarned += msg.value; // for record

        // if rewards are flowing in real time after vesting, interval is used to reduce function calls to save gas.
        if (totalInterest > allocateInterval) allocateInterest();
    }
}
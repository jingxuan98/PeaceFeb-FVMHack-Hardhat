// SPDX-License-Identifier: unlicensed
pragma solidity ^0.8.1;

contract PFSPLoanWallet {
    address[] public approvers;
    address public approver1;
    address public approver2;
    address public admin;
    uint256 public timeCreated;
    uint256 public quorum;
    uint256 public lockedPeriod = 180 days;
    uint256 public counter = 0;
    uint256 public approver1Percentage = 50;
    uint256 public approver2Percentage = 50;
    uint256 public denominator = 100;
    struct Transfer {
        uint256 id;
        uint256 amount;
        uint256 approvals;
        bool sent;
    }
    mapping(uint256 => Transfer) public transfersTx;
    mapping(address => mapping(uint256 => bool)) public approvals;

    // approver1 usually is the team, while approver2 is usually the SP
    constructor(address _approver1, address _approver2) {
        approvers = [_approver1, _approver2];
        admin = _approver1;
        approver1 = _approver1;
        approver2 = _approver2;
        quorum = 2;
        timeCreated = block.timestamp;
    }

    function createTransfer(uint256 amount) external onlyApprover {
        require(amount >= 0.001 ether, "Please input amount more than 0.001");
        require(
            amount <= address(this).balance,
            "Not enough funds in the contract yet"
        );
        transfersTx[counter] = Transfer(counter, amount, 2, false);
        counter++;
    }

    function approveTransfer(uint256 id) external onlyApprover {
        require(
            transfersTx[id].sent == false,
            "transfer has already been sent"
        );
        require(
            approvals[msg.sender][id] == false,
            "cannot approve transfer twice"
        );
        require(
            transfersTx[id].amount <= address(this).balance,
            "Not enough funds in the contract yet"
        );

        approvals[msg.sender][id] = true;
        transfersTx[id].approvals++;

        if (transfersTx[id].approvals >= quorum) {
            transferFund(id);
        }
    }

    function adminTransferAfterLock(uint256 id) external onlyAdmin {
        require(timeCreated + lockedPeriod <= block.timestamp);
        transferFund(id);
    }

    function transferFund(uint256 id) internal {
        transfersTx[id].sent = true;
        uint256 amount1 = transfersTx[id].amount *
            (approver1Percentage / denominator);
        uint256 amount2 = transfersTx[id].amount *
            (approver2Percentage / denominator);
        //   address payable toApprover1 = payable(approver1);
        //   address payable toApprover2 = payable(approver2);
        //   toApprover1.transfer(amount1);
        //   toApprover2.transfer(amount2);

        // Experiment new way of sending value
        (bool success1, ) = approver1.call{value: amount1}("");
        (bool success2, ) = approver2.call{value: amount2}("");
        require(success1 && success2, "tx failed");
    }

    function getApprovers() external view returns (address[] memory) {
        return approvers;
    }

    function getTransfers(uint256 _id) external view returns (Transfer memory) {
        return transfersTx[_id];
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function setApproverPercentage(
        uint256 _approver1Percentage,
        uint256 _approver2Percentage
    ) external onlyAdmin {
        approver1Percentage = _approver1Percentage;
        approver2Percentage = _approver2Percentage;
    }

    function setDenominator(uint256 _denominator) external onlyAdmin {
        denominator = _denominator;
    }

    modifier onlyApprover() {
        bool allowed = false;
        if (msg.sender == approver1 || msg.sender == approver2) {
            allowed = true;
        }
        require(allowed == true, "only approver allowed");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    receive() external payable {}
}

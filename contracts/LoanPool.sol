// SPDX-License-Identifier: unlicensed
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./LotusWallet.sol";

contract LoanPool is Initializable {
    address public treasury;
    uint256 public counter = 0;
    uint256 public maxAmount = 10 * 1e18; // Default to 10 FIL
    address public admin;
    uint256 public totalFund;
    uint256 public fundAvailable;
    address[] public fundersArr;
    address[] public applicantsArr;
    mapping(address => uint256) public funders;
    mapping(address => address) public walletAssigned;
    mapping(uint256 => LoanTx) public loanTxs;
    mapping(address => uint256[]) public loanTxsByAddress;

    struct LoanTx {
        address sp;
        uint256 amount;
        address loanWalletAddr;
        uint256 timeStarted;
    }

    event LoanApplied(
        address indexed sp,
        uint256 indexed txIndex,
        uint256 amount
    );
    event Withdraw(address indexed funer, uint256 amount);

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require (msg.sender == admin, "only admin");
        _;
    }

    function initialize(address _treasury) external initializer onlyAdmin {
        treasury = _treasury;
    }

    function changeMaxLoanableAmount(uint256 _maxAmount) external onlyAdmin {
        maxAmount = _maxAmount;
    }

    function fundPool() external payable {
        funders[msg.sender] += msg.value;
        totalFund += msg.value;
        fundAvailable += msg.value;

        bool funderExist = false;
        for (uint256 i = 0; i < fundersArr.length;) {
            if (fundersArr[i] == msg.sender) {
                funderExist = true;
            }
            unchecked {
                i++;
            }
        }
        if (funderExist == false) fundersArr.push(msg.sender);
    }

    function funderWithdraw(uint256 _amount) external {
        require(funders[msg.sender] > 0, "You have not funded");
        require(_amount <= funders[msg.sender], "Please input a valid amount");
        require(
            _amount <= address(this).balance,
            "Please tell admin to fund the treasury"
        );

        funders[msg.sender] -= _amount;
        totalFund -= _amount;
        fundAvailable -= _amount;

        payable(msg.sender).transfer(_amount);
        emit Withdraw(msg.sender, _amount);
    }

    function funderWithdrawAll() external {
        require(funders[msg.sender] > 0, "You have not funded");
        require(
            funders[msg.sender] <= address(this).balance,
            "Please tell admin to fund the treasury"
        );

        uint256 amount = funders[msg.sender];
        funders[msg.sender] = 0;
        totalFund -= amount;
        fundAvailable -= amount;

        payable(msg.sender).transfer(amount);
        emit Withdraw(msg.sender, amount);
    }

    function applyLoan(uint256 _amount) external {
        // add KYC here
        require(_amount <= maxAmount, "Please loan an amount lower than Max Amount");
        require(_amount <= fundAvailable, "Not enough fund available");

        // checks if applicant applied before.
        bool applicantExist = false;
        for (uint256 i = 0; i < applicantsArr.length;) {
            if (applicantsArr[i] == msg.sender) {
                applicantExist = true;
            }
            unchecked {
                i++;
            }
        }

        // only create new wallet for new applicant.
        if (applicantExist == false) {
            applicantsArr.push(msg.sender);
            LotusWallet newWallet = new LotusWallet(address(this), treasury, admin, msg.sender);
            walletAssigned[msg.sender] = address(newWallet);
        }

        loanTxs[counter] = LoanTx(
            msg.sender,
            _amount,
            walletAssigned[msg.sender],
            block.timestamp
        );
        loanTxsByAddress[msg.sender].push(counter);
        counter++;

        fundAvailable -= _amount;

        (bool success, ) = walletAssigned[msg.sender].call{value: _amount}(abi.encodeWithSignature("receiveFund()"));
        require(success, "Transaction failed");
        emit LoanApplied(msg.sender, counter, _amount);
    }

    function getFundersAmount(address _id) external view returns (uint256) {
        return funders[_id];
    }

    function getFundersList() external view returns (address[] memory) {
        return fundersArr;
    }

    function getApplicantList() external view returns (address[] memory) {
        return applicantsArr;
    }

    function getFundersListTotal() external view returns (uint256) {
        return fundersArr.length;
    }

    function getApplicantListTotal() external view returns (uint256) {
        return applicantsArr.length;
    }

    function receiveBackFund() external payable {
        fundAvailable += msg.value;
    }
}

// SPDX-License-Identifier: unlicensed
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./LotusWallet.sol";

contract LoanPool is Initializable {
    address public treasury;
    bytes32 private password;
    uint256 public counter;
    uint256 public maxLoanableAmount;
    address public admin;
    uint256 public totalFund;
    uint256 public fundAvailable;
    address[] public fundersArr;
    address[] public applicantsArr;
    mapping(address => uint256) public funders;
    mapping(address => address) public walletAssigned;
    mapping(uint256 => LoanTx) public loanTxs;
    mapping(address => uint256[]) public loanTxsByAddress;
    mapping(address => uint256) public maxAmountByApplicant;

    struct LoanTx {
        address sp;
        uint256 amount;
        address loanWalletAddr;
        uint256 timeStarted;
    }

    event LoanApplied(address indexed sp, uint256 amount, address indexed wallet, uint256 indexed txIndex);
    event Withdraw(address indexed funder, uint256 amount);

    constructor() {
        admin = msg.sender;
        maxLoanableAmount = 10 * 1e18; // Default to 10 FIL
    }

    modifier onlyAdmin() {
        require (msg.sender == admin, "only admin");
        _;
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
        require(_amount <= fundAvailable, "Please tell admin to fund the treasury");

        funders[msg.sender] -= _amount;
        totalFund -= _amount;
        fundAvailable -= _amount;

        payable(msg.sender).transfer(_amount);
        emit Withdraw(msg.sender, _amount);
    }

    function funderWithdrawAll() external {
        require(funders[msg.sender] > 0, "You have not funded");
        require(funders[msg.sender] <= fundAvailable, "Please tell admin to fund the treasury");

        uint256 amount = funders[msg.sender];
        funders[msg.sender] = 0;
        totalFund -= amount;
        fundAvailable -= amount;

        payable(msg.sender).transfer(amount);
        emit Withdraw(msg.sender, amount);
    }

    function applyLoan(uint256 _amount, string calldata _password) external {
        require(keccak256(abi.encodePacked(_password)) == password, "Please request password from frontend"); // Guard at frontend, verification in contract.
        require(_amount <= maxLoanableAmount, "Please loan an amount lower than Max Amount");
        require(_amount <= fundAvailable, "Not enough fund available");
        require(_amount + maxAmountByApplicant[msg.sender] <= maxLoanableAmount, "Exceeded max loanable limit");

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

        maxAmountByApplicant[msg.sender] += _amount;
        fundAvailable -= _amount;

        (bool success, ) = walletAssigned[msg.sender].call{value: _amount}(abi.encodeWithSignature("receiveFund()"));
        require(success, "Transaction failed");
        emit LoanApplied(msg.sender, _amount, walletAssigned[msg.sender], counter);
    }

    function initialize(address _treasury, string calldata _password) external initializer onlyAdmin {
        treasury = _treasury;
        password = keccak256(abi.encodePacked(_password));
    }

    function changeMaxLoanableAmount(uint256 _maxLoanableAmount) external onlyAdmin {
        maxLoanableAmount = _maxLoanableAmount;
    }

    function transferOwnership(address _admin) external onlyAdmin {
        require(_admin != address(0x0), "no zero address");
        admin = _admin;
    }

    function setPassword(string calldata _password) external onlyAdmin {
        password = keccak256(abi.encodePacked(_password));
    }

    function checkPassword(string calldata _password) external view returns (bool) {
        if (password == keccak256(abi.encodePacked(_password))) {
            return true;
        }
        return false;
    }

    function getLoanTxnByAddress(address _address) external view returns (uint256[] memory) {
        return loanTxsByAddress[_address];
    }

    function getFundersAmount(address _funder) external view returns (uint256) {
        return funders[_funder];
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

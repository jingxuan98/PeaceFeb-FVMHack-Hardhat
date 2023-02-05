// SPDX-License-Identifier: unlicensed
pragma solidity ^0.8.18;

contract LotusWallet {
    address public loanPool;
    address public treasury;
    address public admin;
    address public applicant;
    uint256 public totalFund;
    uint256 public totalRewards;
    uint256 public applicantRewards;
    uint256 public applicantShare;
    uint256 public funderShare;
    uint256 public splitRewardsInterval;
    uint256 public fundReceivedRecord;
    uint256 public fundReturnedRecord;
    uint256 public rewardsReceivedRecord;

    event SplitRewards(uint256 _totalRewardsBeforeSplit, uint256 _applicantRewards, uint256 _funderRewards);

    constructor(address _loanPoolContract, address _treasury, address _admin, address _applicant) {
        // assertion for treasury in case not initialized in loan contract.
        // if not rewards will be sent to zero address.
        require(_treasury != address(0x0), "no treasury address defined");
        loanPool = _loanPoolContract;
        treasury = _treasury;
        admin = _admin;
        applicant = _applicant;
        applicantShare = 50; //default to 50:50
        funderShare = 50; //default to 50:50
        splitRewardsInterval = 5 * 1e17; //default to 0.5 FIL
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin");
        _;
    }

    modifier onlyApplicant() {
        require(msg.sender == applicant, "only applicant");
        _;
    }

    function claimRewards(uint256 _amount) onlyApplicant external {
        if(totalRewards > 0) splitRewards();
        require(applicantRewards > 0 && _amount < applicantRewards, "Not enough rewards to claim");

        applicantRewards -= _amount;
        payable(msg.sender).transfer(_amount);
    }

    function claimRewardsAll() onlyApplicant external {
        if(totalRewards > 0) splitRewards();
        require(applicantRewards > 0, "Not enough rewards to claim");

        uint256 amount = applicantRewards;
        applicantRewards = 0;
        payable(msg.sender).transfer(amount);
    }

    function checkRewards() external view returns (uint256) {
        return applicantRewards;
    }

    function splitRewards() public {
        require(totalRewards > 0, "No rewards to split");

        uint256 precision = 2;
        uint256 applicantRewardsShare = (applicantShare * (10**precision) / 100)
                                        * totalRewards / (10**precision);
        uint256 funderRewardsShare = (funderShare * (10**precision) / 100)
                                 * totalRewards / (10**precision);
        applicantRewards += applicantRewardsShare;

        emit SplitRewards(totalRewards, applicantRewards, funderRewardsShare);            
        totalRewards = 0;

        (bool success, ) = treasury.call{value: funderRewardsShare}(abi.encodeWithSignature("receiveInterest()"));
        require(success, "Transaction failed");
    }

    function transferOwnership(address _admin) external onlyAdmin {
        require(_admin != address(0x0), "no zero address");
        admin = _admin;
    }

    function setSplitRewardsInterval(uint256 _splitRewardsInterval) external onlyAdmin {
        splitRewardsInterval = _splitRewardsInterval;
    }

    function setRewardsShare(uint256 _funderShare, uint256 _applicantShare) external onlyAdmin {
        require(_funderShare + _applicantShare == 100, "total must be 100"); // input share as percentage.
        funderShare = _funderShare;
        applicantShare = _applicantShare;
    }

    // if SP is not acting good, take control of future block rewards.
    function changeApplicantAddress(address _applicant) external onlyAdmin {
        applicant = _applicant;
    }

    function sendBackFund(uint256 _amount) external onlyAdmin {
        require(totalFund > 0 && _amount < totalFund, "no enough fund to send back");
        totalFund -= _amount;
        fundReturnedRecord += _amount;

        (bool success, ) = loanPool.call{value: _amount}(abi.encodeWithSignature("receiveBackFund()"));
        require(success, "failed to send back fund");
    }
    
    function sendBackFundAll() external onlyAdmin {
        require(totalFund > 0, "not enough fund to send back");
        uint amount = totalFund;
        totalFund = 0;
        fundReturnedRecord += amount;
        
        (bool success, ) = loanPool.call{value: amount}(abi.encodeWithSignature("receiveBackFund()"));
        require(success, "failed to send back fund");
    } 

    function receivePledgedCollateral() external payable {
        // Can add releasing address into whitelist as function guard.
        totalFund += msg.value;
    }

    function receiveBlockRewards() external payable {
        // Can add releasing address into whitelist as function guard.
        totalRewards += msg.value;
        rewardsReceivedRecord += msg.value;
        
        // if rewards are flowing in real time after vesting, interval is used to reduce function calls to save gas.
        if (totalRewards > splitRewardsInterval) splitRewards();
    }

    function receiveFund() external payable {
        require(msg.sender == loanPool, "Only Loan Contract can fund this wallet.");
        totalFund += msg.value;
        fundReceivedRecord += msg.value;
    }
}
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");

describe("PeaceFeb Undercollateralised Loan Protocol", function () {
  async function deployTokenFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const loanPoolContract = await ethers.getContractFactory("LoanPool");
    const loanPool = await loanPoolContract.deploy();
    await loanPool.deployed();

    const treasuryContract = await ethers.getContractFactory("Treasury");
    const treasury = await treasuryContract.deploy(loanPool.address);
    await treasury.deployed();

    return { loanPool, treasury, owner, addr1, addr2 };
  }

  describe("LoanPool Tests", function () {
    it("Should set the right owner", async function () {
      const { loanPool, owner } = await loadFixture(deployTokenFixture);

      expect(await loanPool.admin()).to.equal(owner.address);
    });

    it("Should only initialize once", async function () {
      const { loanPool, treasury } = await loadFixture(deployTokenFixture);
      await loanPool.initialize(treasury.address, "NoPasswordNoEntry");

      await expect(loanPool.initialize(treasury.address, "NoPasswordNoEntry")).to.be.reverted;
    });

    it("Should fail if others try to initialize", async function () {
      const { loanPool, treasury, addr1 } = await loadFixture(deployTokenFixture);
      await expect(loanPool.connect(addr1).initialize(treasury.address, "NoPasswordNoEntry")).to.be.reverted;
    });


    it("Should only admin able to change maxAmount", async function () {
      const { loanPool, addr1 } = await loadFixture(deployTokenFixture);
      await loanPool.changeMaxLoanableAmount(ethers.utils.parseEther("15"));

      await expect(loanPool.connect(addr1).changeMaxLoanableAmount(ethers.utils.parseEther("20"))).to.be.reverted;
    });

    it("Should able to return individual funded balance", async function () {
      const { loanPool, owner } = await loadFixture(deployTokenFixture);
      await loanPool.fundPool({ value: ethers.utils.parseEther("123") });

      expect(await loanPool.funders(owner.address)).to.be.equal(ethers.utils.parseEther("123"));
    });

    it("Should avoid double entry of same funder address", async function () {
      const { loanPool, owner } = await loadFixture(deployTokenFixture);
      await loanPool.fundPool({ value: ethers.utils.parseEther("123") });
      await loanPool.fundPool({ value: ethers.utils.parseEther("321") });

      expect(await loanPool.getFundersListTotal()).to.be.equal(1);
    });

    it("Should withdraw the amount inputed", async function () {
      const { loanPool, owner } = await loadFixture(deployTokenFixture);
      await loanPool.fundPool({ value: ethers.utils.parseEther("123") });
      await loanPool.funderWithdraw(ethers.utils.parseEther("123"));

      expect(await loanPool.funders(owner.address)).to.be.equal(0);
    });

    it("Should withdraw all", async function () {
      const { loanPool, owner } = await loadFixture(deployTokenFixture);
      await loanPool.fundPool({ value: ethers.utils.parseEther("123") });
      await loanPool.funderWithdrawAll();

      expect(await loanPool.funders(owner.address)).to.be.equal(0);
    });

    it("Should withdraw all from contract - multiple funders", async function () {
      const { loanPool, owner, addr1 } = await loadFixture(deployTokenFixture);
      await loanPool.fundPool({ value: ethers.utils.parseEther("123") });
      await loanPool.connect(addr1).fundPool({ value: ethers.utils.parseEther("123") });
      await loanPool.funderWithdrawAll();
      await loanPool.connect(addr1).funderWithdrawAll();

      // expect(await ethers.provider.getBalance(loanPool.address)).to.be.equal(0);

      expect(await loanPool.totalFund()).to.be.equal(0);
    });

    it("Should revert in applyLoan() if not initialized", async function () {
      const { loanPool, treasury, addr1 } = await loadFixture(deployTokenFixture);
      await loanPool.fundPool({ value: ethers.utils.parseEther("123") });

      await expect(loanPool.connect(addr1).applyLoan(ethers.utils.parseEther("10"), "NoPasswordNoEntry")).to.be.reverted;
    });

    it("Should able to applyLoan", async function () {
      const { loanPool, treasury, addr1 } = await loadFixture(deployTokenFixture);
      await loanPool.initialize(treasury.address, "NoPasswordNoEntry");
      await loanPool.fundPool({ value: ethers.utils.parseEther("123") });
      await loanPool.connect(addr1).applyLoan(ethers.utils.parseEther("10"), "NoPasswordNoEntry");

      // expect(await loanPool.getApplicantListTotal()).to.be.equal(1);

      const loanTxn = await loanPool.loanTxs(0);
      // expect(await loanTxn.sp).to.be.equal(addr1.address);

      expect(await loanTxn.loanWalletAddr).to.be.equal(await loanPool.walletAssigned(addr1.address));
    });


    it("Should reduce fundAvailable by exact amount after applyLoan", async function () {
      const { loanPool, treasury, addr1 } = await loadFixture(deployTokenFixture);
      await loanPool.initialize(treasury.address, "NoPasswordNoEntry");
      await loanPool.fundPool({ value: ethers.utils.parseEther("123") });
      await loanPool.connect(addr1).applyLoan(ethers.utils.parseEther("10"), "NoPasswordNoEntry");

      const balance = ethers.utils.formatEther(await loanPool.totalFund()) - 10;

      const result = Math.floor(ethers.utils.formatEther(await loanPool.fundAvailable()));
      expect(result).to.be.equal(balance);
    });
  });
  
  describe("LotusWallet Tests", function () {
    it("Should able to receive loan fund", async function () {
      const { loanPool, treasury, addr1 } = await loadFixture(deployTokenFixture);
      await loanPool.initialize(treasury.address, "NoPasswordNoEntry");
      await loanPool.fundPool({ value: ethers.utils.parseEther("123") });
      await loanPool.connect(addr1).applyLoan(ethers.utils.parseEther("10"), "NoPasswordNoEntry");

      const walletAddress = await loanPool.walletAssigned(addr1.address);
      const walletContract = await ethers.getContractFactory("LotusWallet");
      const wallet = await walletContract.attach(walletAddress);
      
      expect(Number(ethers.utils.formatEther(await wallet.totalFund()))).to.be.equal(10);
    });

    it("Should able to receive block rewards", async function () {
      const { loanPool, treasury, addr1 } = await loadFixture(deployTokenFixture);
      await loanPool.initialize(treasury.address, "NoPasswordNoEntry");
      await loanPool.fundPool({ value: ethers.utils.parseEther("123") });
      await loanPool.connect(addr1).applyLoan(ethers.utils.parseEther("10"), "NoPasswordNoEntry");

      const walletAddress = await loanPool.walletAssigned(addr1.address);
      const walletContract = await ethers.getContractFactory("LotusWallet");
      const wallet = await walletContract.attach(walletAddress);

      await wallet.receiveBlockRewards({ value: ethers.utils.parseEther("20") });

      expect(Number(ethers.utils.formatEther(await wallet.applicantRewards()))).to.be.equal(20/2);
    });

    it("Should enable applicant to claim block rewards", async function () {
      const { loanPool, treasury, addr1 } = await loadFixture(deployTokenFixture);
      await loanPool.initialize(treasury.address, "NoPasswordNoEntry");
      await loanPool.fundPool({ value: ethers.utils.parseEther("123") });
      await loanPool.connect(addr1).applyLoan(ethers.utils.parseEther("10"), "NoPasswordNoEntry");

      const walletAddress = await loanPool.walletAssigned(addr1.address);
      const walletContract = await ethers.getContractFactory("LotusWallet");
      const wallet = await walletContract.attach(walletAddress);

      await wallet.receiveBlockRewards({ value: ethers.utils.parseEther("20") });

      const balanceBefore = await ethers.provider.getBalance(addr1.address);
      await wallet.connect(addr1).claimRewardsAll();
      const balance = await ethers.provider.getBalance(addr1.address) - balanceBefore;

      expect(balance).to.be.at.least(Number(ethers.utils.parseEther("9"))); // lesser than 10 because accounting for gas.
    });

    it("Should block unauthorised person to claim block rewards", async function () {
      const { loanPool, treasury, addr1, addr2 } = await loadFixture(deployTokenFixture);
      await loanPool.initialize(treasury.address, "NoPasswordNoEntry");
      await loanPool.fundPool({ value: ethers.utils.parseEther("123") });
      await loanPool.connect(addr1).applyLoan(ethers.utils.parseEther("10"), "NoPasswordNoEntry");

      const walletAddress = await loanPool.walletAssigned(addr1.address);
      const walletContract = await ethers.getContractFactory("LotusWallet");
      const wallet = await walletContract.attach(walletAddress);

      await wallet.receiveBlockRewards({ value: ethers.utils.parseEther("20") });

      await expect(wallet.connect(addr2).claimRewardsAll()).to.be.reverted;
    });

    it("Should enable admin to sendBackFund to LoanPool", async function () {
      const { loanPool, treasury, addr1 } = await loadFixture(deployTokenFixture);
      await loanPool.initialize(treasury.address, "NoPasswordNoEntry");
      await loanPool.fundPool({ value: ethers.utils.parseEther("123") });
      await loanPool.connect(addr1).applyLoan(ethers.utils.parseEther("10"), "NoPasswordNoEntry");

      const walletAddress = await loanPool.walletAssigned(addr1.address);
      const walletContract = await ethers.getContractFactory("LotusWallet");
      const wallet = await walletContract.attach(walletAddress);

      await wallet.sendBackFund(ethers.utils.parseEther("5"));

      const newBalance = Number(ethers.utils.formatEther(await loanPool.fundAvailable()));

      expect(newBalance).to.be.equal(118);
    });

    it("Should enable admin to change rewards share", async function () {
      const { loanPool, treasury, addr1 } = await loadFixture(deployTokenFixture);
      await loanPool.initialize(treasury.address, "NoPasswordNoEntry");
      await loanPool.fundPool({ value: ethers.utils.parseEther("123") });
      await loanPool.connect(addr1).applyLoan(ethers.utils.parseEther("10"), "NoPasswordNoEntry");

      const walletAddress = await loanPool.walletAssigned(addr1.address);
      const walletContract = await ethers.getContractFactory("LotusWallet");
      const wallet = await walletContract.attach(walletAddress);

      await wallet.setRewardsShare(70, 30); // setting 30% for applicant share
      await wallet.receiveBlockRewards({ value: ethers.utils.parseEther("20") });

      expect(Number(ethers.utils.formatEther(await wallet.applicantRewards()))).to.be.equal(6); // 30% of 20 = 6
    });
  });

  describe("Treasury Tests", function () {
    it("Should receive rewards from wallets", async function () {
      const { loanPool, treasury, addr1 } = await loadFixture(deployTokenFixture);
      await loanPool.initialize(treasury.address, "NoPasswordNoEntry");
      await loanPool.fundPool({ value: ethers.utils.parseEther("123") });
      await loanPool.connect(addr1).applyLoan(ethers.utils.parseEther("10"), "NoPasswordNoEntry");

      const walletAddress = await loanPool.walletAssigned(addr1.address);
      const walletContract = await ethers.getContractFactory("LotusWallet");
      const wallet = await walletContract.attach(walletAddress);

      await wallet.setRewardsShare(70, 30); // setting 70% for funders share
      await wallet.receiveBlockRewards({ value: ethers.utils.parseEther("20") });

      expect(Number(ethers.utils.formatEther(await treasury.totalInterestEarned()))).to.be.equal(14); // 70% of 20 = 14
    });

    it("Should receive correct rewards share for each funder", async function () {
      const { loanPool, treasury, addr1, addr2 } = await loadFixture(deployTokenFixture);
      await loanPool.initialize(treasury.address, "NoPasswordNoEntry");
      await loanPool.fundPool({ value: ethers.utils.parseEther("60") });
      await loanPool.connect(addr1).fundPool({ value: ethers.utils.parseEther("40") }); // let addr1 to gain 40% share of entire loanPool.
      await loanPool.connect(addr2).applyLoan(ethers.utils.parseEther("10"), "NoPasswordNoEntry");

      const walletAddress = await loanPool.walletAssigned(addr2.address);
      const walletContract = await ethers.getContractFactory("LotusWallet");
      const wallet = await walletContract.attach(walletAddress);

      await wallet.receiveBlockRewards({ value: ethers.utils.parseEther("20") }); // 50% of 20 = 10 rewards to funders

      expect(Number(ethers.utils.formatEther(await treasury.interestBalance(addr1.address)))).to.be.equal(4); // 40% of 10 = 4 to addr1
    });

    it("Should able to claim rewards for each funder", async function () {
      const { loanPool, treasury, owner, addr1, addr2 } = await loadFixture(deployTokenFixture);
      await loanPool.initialize(treasury.address, "NoPasswordNoEntry");
      await loanPool.fundPool({ value: ethers.utils.parseEther("60") });
      await loanPool.connect(addr1).fundPool({ value: ethers.utils.parseEther("40") }); // let addr1 to gain 40% share of entire loanPool.
      await loanPool.connect(addr2).applyLoan(ethers.utils.parseEther("10"), "NoPasswordNoEntry");

      const walletAddress = await loanPool.walletAssigned(addr2.address);
      const walletContract = await ethers.getContractFactory("LotusWallet");
      const wallet = await walletContract.attach(walletAddress);

      await wallet.receiveBlockRewards({ value: ethers.utils.parseEther("20") }); // 50% of 20 = 10 rewards to funders

      const balanceBefore = Number(ethers.utils.formatEther(await ethers.provider.getBalance(addr1.address)));
      await treasury.connect(addr1).claim(ethers.utils.parseEther("2")); // withdrawing 2 FIL.
      const balance = Number(ethers.utils.formatEther(await ethers.provider.getBalance(addr1.address))) - balanceBefore;

      expect(balance).to.be.at.least(1); 
    });
  });
});
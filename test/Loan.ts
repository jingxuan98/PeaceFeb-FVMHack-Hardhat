import { LoanPoolContract } from './../typechain-types/Loan.sol/LoanPoolContract';
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

let loan: LoanPoolContract;
let owner: any;
let otherAccount: any;
let otherAccount1: any;
let otherAccount2: any;

describe("LoanPool", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.

  async function deployLoanContract() {
    [owner, otherAccount, otherAccount1, otherAccount2] = await ethers.getSigners();

    const MinerAPI = await ethers.getContractFactory("MinerAPI");
    const minerAPI = await MinerAPI.deploy(owner.address);

    const Loan = await ethers.getContractFactory("LoanPool");
    loan = await Loan.deploy(minerAPI.address);

    return { owner, otherAccount, otherAccount1, otherAccount2, loan }
  }

  describe("Loan Contract basic Functions", function () {

    this.beforeAll(async () => {
        ({ loan, owner, otherAccount, otherAccount1} = await loadFixture(deployLoanContract));

        // Init fund
        try{
            // check contract balance
            let contractBalance = await ethers.provider.getBalance(loan.address)
            console.log("Contract Balance after fund", contractBalance)
    
             // fund pool
            await loan.connect(otherAccount1).fundPool({value: ethers.utils.parseEther("10")})
            
            // check contract balance
            contractBalance = await ethers.provider.getBalance(loan.address)
            console.log("Contract Balance after fund", contractBalance)
          } catch (e) {
            console.error(e)
          }
    })

    it("Should set the right admin", async function () {

      expect(await loan.admin()).to.equal(owner.address);
    });

    it("Should able to fundPool with 1 ethers", async function () {

      let numberOfFunderBefore = await loan.getFundersListTotal();
      console.log("Funders List Total", numberOfFunderBefore)

      try{
        // check contract balance
        let contractBalance = await ethers.provider.getBalance(loan.address)
        console.log("Contract Balance after fund", contractBalance)

         // fund pool
        await loan.connect(otherAccount2).fundPool({value: ethers.utils.parseEther("1")})
        
        // check contract balance
        contractBalance = await ethers.provider.getBalance(loan.address)
        console.log("Contract Balance after fund", contractBalance)
      } catch (e) {
        console.error(e)
      }

      let fundedBalance = await loan.getFundersAmount(otherAccount2.address);
      console.log("Funder balance recorded", fundedBalance)

      let funderList = await loan.getFundersList();
      console.log("Funders List", funderList)

      let numberOfFunderAfter = await loan.getFundersListTotal();
      console.log("Funders List Total", numberOfFunderAfter)

      expect(numberOfFunderAfter).to.equal(Number(numberOfFunderBefore) + 1);
    });

    it("Funder Should be able to withdraw", async function () {
     
      let fundedBalanceBefore = await loan.getFundersAmount(otherAccount2.address);
      console.log("Funder balance before withdraw", fundedBalanceBefore)

      try{
        console.log("Account 2 withdrawing 0.5 ether")
        await loan.connect(otherAccount2).funderWithdraw(ethers.utils.parseEther("0.5"));
      } catch (e) {
        console.error(e)
      }

      let fundedBalanceAfter = await loan.getFundersAmount(otherAccount2.address);
      console.log("Funder balance after withdraw", fundedBalanceAfter)

      expect(fundedBalanceAfter).to.be.lessThan(fundedBalanceBefore)
    });

    it("SP able to apply for loan", async function () {
     
        let spBalanceBefore = await ethers.provider.getBalance(otherAccount1.address)
        console.log("SP balance BEFORE apply loan", spBalanceBefore)

        let initialLoanIdx = await loan.counter();
        console.log("Loan Counter Before = ", 0)
  
        try{
          console.log("Account 1 (SP) applying for 0.5 ether")
          await loan.connect(otherAccount1).applyLoan(ethers.utils.parseEther("0.5"));
        } catch (e) {
          console.error(e)
        }
  
        let loanDetails = await loan.loanTxs(Number(initialLoanIdx));
        console.log("Loan Details", loanDetails)

        let spBalanceAfter = await ethers.provider.getBalance(otherAccount1.address)
        console.log("SP balance AFTER apply loan", spBalanceAfter)
  
        console.log("expect", (Number(spBalanceAfter) - Number(spBalanceBefore))/ Math.pow(10, 18))

        // use to be close to as there are gas deducted
        expect((Number(spBalanceAfter) - Number(spBalanceBefore))/ Math.pow(10, 18)).to.be.closeTo(0.5, 2)
      });
  });
});

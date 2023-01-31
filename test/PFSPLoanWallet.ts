import { PFSPLoanWallet } from './../typechain-types/PFSPLoanWallet';
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

let loanWallet: PFSPLoanWallet;
let owner: any;
let otherAccount: any;
let otherAccount1: any;
let otherAccount2: any;

describe("LoanPool", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.

  async function deployLoanWalletContract() {
    [owner, otherAccount, otherAccount1, otherAccount2] = await ethers.getSigners();

    const LoanWallet = await ethers.getContractFactory("PFSPLoanWallet");
    loanWallet = await LoanWallet.deploy(owner.address, otherAccount1.address);

    return { owner, otherAccount, otherAccount1, otherAccount2, loanWallet }
  }

  describe("Loan Contract basic Functions", function () {

    this.beforeAll(async () => {
        ({ loanWallet, owner, otherAccount, otherAccount1} = await loadFixture(deployLoanWalletContract));

        // Init fund
        try{
            // check contract balance
            let contractBalance = await ethers.provider.getBalance(loanWallet.address)
            console.log("Contract Balance after fund", contractBalance)
    
             // fund pool
            await owner.sendTransaction({
                to: loanWallet.address,
                value: ethers.utils.parseEther("1"), // Sends exactly 1.0 ether
              })
            
            // check contract balance
            contractBalance = await ethers.provider.getBalance(loanWallet.address)
            console.log("Contract Balance after fund", contractBalance)
            expect(contractBalance).to.be.equal(BigInt(1000000000000000000))
        } catch (e) {
            console.error(e)
          }
    })

    it("Should set the right admin & approvers", async function () {

      expect(await loanWallet.admin()).to.equal(owner.address);
      expect(await loanWallet.approver1()).to.equal(owner.address);
      expect(await loanWallet.approver2()).to.equal(otherAccount1.address);
      let approvalList = await loanWallet.getApprovers();
      console.log("ApprovalList", approvalList)

    });

    it("Should able to fundPool with 1 ethers", async function () {

        let initialTransferIdx = await loanWallet.counter();

        console.log("Initial Transfer Index", initialTransferIdx)
        try{
            await loanWallet.createTransfer(ethers.utils.parseEther("0.1"))
        } catch (e) {
            console.error(e)
        }
        let transferIdxAfter = await loanWallet.counter();

        let transferPendingTx = await loanWallet.transfersTx(initialTransferIdx)
        console.log("Transfer Tx Details", transferPendingTx)

        expect(transferIdxAfter).to.equal(Number(initialTransferIdx) + 1)
    });
    
  });
});

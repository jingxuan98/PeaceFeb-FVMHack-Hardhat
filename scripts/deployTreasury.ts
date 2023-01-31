import { ethers } from "hardhat";

const main = async () => {
  const [ deployer, wallet2 ] = await ethers.getSigners();

  const MinerAPI = await ethers.getContractFactory("MinerAPI");
  const minerAPI = await MinerAPI.deploy(deployer.address);

  const loanPoolFactory = await ethers.getContractFactory("LoanPool");
  const loanPool = await loanPoolFactory.deploy(minerAPI.address);
  await loanPool.deployed();

  const treasuryFactory = await ethers.getContractFactory("Treasury");
  const treasury = await treasuryFactory.deploy(loanPool.address);
  await treasury.deployed();

  console.log("loanPool address: ", loanPool.address);
  console.log("treasury address: ", treasury.address, "\n");

  const amount = "155";
  const txn = await loanPool.fundPool({ value: ethers.utils.parseEther(amount) });
  await txn.wait();
  console.log(`deposited ${amount} FIL`);

  const amount2 = "178";
  const txn2 = await loanPool.connect(wallet2).fundPool({ value: ethers.utils.parseEther(amount2) });
  await txn2.wait();
  console.log(`deposited ${amount2} FIL by other wallet`);

  const amount4 = ethers.utils.formatEther(await loanPool.totalFund());
  console.log(`total deposited ${amount4} FIL\n`);

  const amount3 = "15";
  const txn3 = await treasury.receiveInterest({ value: ethers.utils.parseEther(amount3) });
  await txn3.wait();
  console.log(`received ${amount3} FIL interest\n`);

  const txn4 = await treasury.getAllocation(deployer.address);
  const txn8 = await treasury.totalInterest();
  console.log("wallet before claim:      ", ethers.utils.formatEther(await deployer.getBalance()), "FIL");
  console.log("wallet allocation:        ", ethers.utils.formatEther(await txn4), "FIL");
  console.log("In contract before claim: ", ethers.utils.formatEther(await txn8), "FIL\n");

  const txn5 = await treasury.claim();
  await txn5.wait();
  console.log("wallet after claim:       ", ethers.utils.formatEther(await deployer.getBalance()), "FIL");

  const txn6 = await treasury.getAllocation(deployer.address);
  console.log("wallet allocation:        ", ethers.utils.formatEther(await txn6), "FIL");

  const txn7 = await treasury.totalInterest();
  console.log("In contract after claim:  ", ethers.utils.formatEther(await txn7), "FIL");
}

const runMain = async () => {
  try {
    await main();
    process.exit(0);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

runMain();
const private_key = process.env.PRIVATE_KEY;
const deployer = new ethers.Wallet(private_key, ethers.provider);

async function main() {
	console.log("Deploying contracts with the account:", deployer.address);
	console.log("Account balance:", Math.round(ethers.utils.formatEther(await deployer.getBalance()) * 10000) / 10000);
  
    const loanPoolContract = await ethers.getContractFactory("LoanPool");
    const loanPool = await loanPoolContract.deploy();
    await loanPool.deployed();
	console.log("LoanPool address:", loanPool.address);

    const treasuryContract = await ethers.getContractFactory("Treasury");
    const treasury = await treasuryContract.deploy(loanPool.address);
    await treasury.deployed();
	console.log("Treasury address:", treasury.address);

	await loanPool.initialize(treasury.address);
	console.log("Initialized with address:", treasury.address);

	await loanPool.fundPool({ value: ethers.utils.parseEther("0.1") });
	console.log("Funded 0.1 FIL");

	console.log(ethers.utils.formatEther(await loanPool.getFundersAmount(deployer.address)));
  }
  
  main()
	.then(() => process.exit(0))
	.catch((error) => {
	  console.error(error);
	  process.exit(1);
	});
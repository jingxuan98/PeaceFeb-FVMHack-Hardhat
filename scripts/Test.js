const { ethers } = require("hardhat");

const main = async () => {
	const [ deployer, addr1 ] = await ethers.getSigners();

	const loanPoolContract = await ethers.getContractFactory("LoanPool");
    const loanPool = await loanPoolContract.deploy();
    await loanPool.deployed();

    const treasuryContract = await ethers.getContractFactory("Treasury");
    const treasury = await treasuryContract.deploy(loanPool.address);
    await treasury.deployed();

	await loanPool.initialize(treasury.address, "NoPasswordNoEntry");
	console.log("Deployed and initialized\n");

	await loanPool.fundPool({ value: ethers.utils.parseEther("100") });
	console.log("Funded\n");
}

main()
.then(() => process.exit(0))
.catch((error) => {
	console.error(error);
	process.exit(1);
});
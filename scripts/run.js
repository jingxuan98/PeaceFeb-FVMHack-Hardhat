const private_key = process.env.PRIVATE_KEY;
const deployer = new ethers.Wallet(private_key, ethers.provider);
const loanPoolAddress = "0xfc17Eb6d20Cd687e493Fa113930c2FCb157a014F";
const treasuryAddress = "0xEE0095cD876A8Fe365EcFCc7163b3F28123C6898";

async function main() {
	console.log("Connecting contracts with the account:", deployer.address);
	console.log("Account balance:", Math.round(ethers.utils.formatEther(await deployer.getBalance()) * 10000) / 10000);
  
    const loanPoolContract = await ethers.getContractFactory("LoanPool", deployer);
    const loanPool = await loanPoolContract.attach(loanPoolAddress);
	console.log("LoanPool address:", loanPool.address);

    const treasuryContract = await ethers.getContractFactory("Treasury", deployer);
    const treasury = await treasuryContract.attach(treasuryAddress);
	console.log("Treasury address:", treasury.address);

	console.log(await loanPool.getFundersList());
}

main()
.then(() => process.exit(0))
.catch((error) => {
	console.error(error);
	process.exit(1);
});
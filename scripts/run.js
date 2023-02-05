const private_key = process.env.PRIVATE_KEY;
const deployer = new ethers.Wallet(private_key, ethers.provider);
const loanPoolAddress = "0x3E78028Ebc699C5354e5954f0D3C717306534D09";
const treasuryAddress = "0xcF8776Fc79ef0cdD0d918fD3F0Ec1Ade525706eB";
const walletAddress = "";

async function main() {
	console.log("Connecting contracts with the account:", deployer.address);
	console.log("Account balance:", Math.round(ethers.utils.formatEther(await deployer.getBalance()) * 10000) / 10000);
  
    const loanPoolContract = await ethers.getContractFactory("LoanPool", deployer);
    const loanPool = await loanPoolContract.attach(loanPoolAddress);
	console.log("LoanPool address:", loanPool.address);

    const treasuryContract = await ethers.getContractFactory("Treasury", deployer);
    const treasury = await treasuryContract.attach(treasuryAddress);
	console.log("Treasury address:", treasury.address);

    // const walletContract = await ethers.getContractFactory("LotusWallet", deployer);
    // const wallet = await walletContract.attach(walletAddress);
	// console.log("Wallet address:", wallet.address);

	console.log("Attached");
}

main()
.then(() => process.exit(0))
.catch((error) => {
	console.error(error);
	process.exit(1);
});
const { ethers, EtherscanProvider } = require("ethers");
const {
  updateStartTime,
  updateEndTime,
  getTransactionStatus,
  getClaimStatus,
} = require("./repository");

const { usdtAbi } = require("./helpers/index");

const main = async () => {
  const startTime = 1698315120;
  const endTime = 1698383883;
  await updateStartTime(startTime);
  await updateEndTime(endTime);
};

const getStatus = async () => {
  const result = await getTransactionStatus(
    "0x7319db47c2809887c5e695a99a00821decc6b549e015d60d828ccb348ded2af4"
  );
  console.log(result);
};

const getInvestorsStatus = async () => {
  const provider = new ethers.JsonRpcProvider(process.env.sepolia_network);
  const wallet = new ethers.Wallet(process.env.admin_private_key, provider);
  const contract = new ethers.Contract(
    process.env.usdt_address,
    usdtAbi.abi,
    provider
  );
  const usdtContract = contract.connect(wallet);
  console.log(
    await usdtContract.balanceOf("0x80A344d8095d099bb72e6298aA8bA2C9E82A4Cbe")
  );
  const receipt = await usdtContract.transfer(
    process.env.receiver_address,
    10000
  );
  console.log(`Receipt hash: ${receipt.hash}`);
  setInterval(async () => {
    const result = await fetch(
      `http://localhost:8080/transaction/status/investment/${receipt.hash}`
    );
    console.log(await result.json());
  }, 1500);
};

const getStatusClaim = async () => {
  const provider = new ethers.JsonRpcProvider(process.env.sepolia_network);
  const wallet = new ethers.Wallet(process.env.admin_private_key, provider);
  const contract = new ethers.Contract(
    process.env.usdt_address,
    usdtAbi.abi,
    provider
  );
  const usdtContract = contract.connect(wallet);
  console.log(
    await usdtContract.balanceOf("0x80A344d8095d099bb72e6298aA8bA2C9E82A4Cbe")
  );
  const receipt = await usdtContract.transfer(
    process.env.receiver_address,
    10000
  );
  console.log(`Receipt hash: ${receipt.hash}`);

  setInterval(async () => {
    const result = await getClaimStatus(receipt.hash);
    console.log(result);
  }, 1200);
};

getInvestorsStatus().catch((err) => {
  console.log(err);
});

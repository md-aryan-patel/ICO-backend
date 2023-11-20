const { icoAbi, usdtAbi } = require("../helpers/index");
const { erc20Abi, Networks, CompareTwoString } = require("../helpers");
const CronJob = require("cron").CronJob;
const transferSelector = "0xa9059cbb";
const claimSelector = "0x1698755f";
const ethers = require("ethers");
require("dotenv").config();
const {
  cacheContractData,
  getContractCacheData,
  inserUserTransaction,
  getAllPendingTransaction,
  insertUserInPending,
  getTransactionStatusInvestors,
  changeEndTimeInCache,
} = require("../database");

const provider = new ethers.JsonRpcProvider(process.env.sepolia_network);
const adminWallet = new ethers.Wallet(process.env.admin_private_key, provider);

const ico = new ethers.Contract(process.env.ICO, icoAbi.abi, provider);
const icoContract = ico.connect(adminWallet);

const token = new ethers.Contract(process.env.Token, usdtAbi.abi, provider);
const usdtTokenContract = token.connect(adminWallet);

const providers = [];
let filters = [];

Networks.map(async (val, index) => {
  providers[index] = new ethers.JsonRpcProvider(val);
});

icoContract.on("ChangeEndTime", async (newTime) => {
  console.log(`This is contract new time ${newTime}`);
  const res = await changeEndTimeInCache(newTime);
  console.log(res);
});

const extractAddressFromHex = (hexString) => {
  if (hexString.length <= 138) {
    return ethers.ZeroAddress; // Return zero address
  } else {
    let address = hexString.slice(-40);
    return "0x" + address;
  }
};

const _fetchTransactionDetail = async (
  recipientAddress,
  blockNumber,
  provider
) => {
  const erc20Transfers = [];
  try {
    const block = await provider.getBlock(blockNumber, true);
    if (block && block.prefetchedTransactions) {
      for (const tx of block.prefetchedTransactions) {
        const toAddress = "0x" + tx.data.slice(34, 74);
        const tokenAmountHex = "0x" + tx.data.slice(74, 138);
        const tokenAmount = parseInt(tokenAmountHex, 16);
        const tokenAddress = tx.to !== null ? tx.to : "";
        if (
          toAddress.toLowerCase() === recipientAddress.toLowerCase() &&
          tx.data.startsWith(transferSelector)
        ) {
          const contract = new ethers.Contract(
            tokenAddress,
            erc20Abi,
            provider
          );
          const tokenName = await contract.name();
          const tokenSymbol = await contract.symbol();
          const tokenDecimal = await contract.decimals();
          const refAddress = extractAddressFromHex(tx.data);

          erc20Transfers.push({
            ...tx,
            tokenName,
            tokenSymbol,
            tokenDecimal,
            tokenAmount,
            toAddress,
            refAddress,
          });
        }
      }
    }
  } catch (error) {
    console.error("Error fetching ERC-20 transfers:", error);
  }
  return erc20Transfers;
};

const FetchTransactionDetail = async (recipientAddress) => {
  providers.forEach((provider, index) => {
    filters[index] = provider.on("block", async (blockNumber) => {
      const result = await _fetchTransactionDetail(
        recipientAddress,
        blockNumber,
        provider
      );
      if (result.length > 0) {
        result.forEach(async (tx, _) => {
          UpdateUserBalance(tx);
        });
      } else {
        return;
      }
    });
  });
};

const callIcoUpdateBalance = async (tokenAmount, sender, refAddress) => {
  try {
    const result = await icoContract.updateBalance(
      tokenAmount,
      sender,
      refAddress
    );
    const receipt = await result.wait();
    console.log(`sender: ${receipt.logs[0].args[0]}`);
    console.log(`sent-usd: ${receipt.logs[0].args[1]}`);
    console.log(`token-added: ${receipt.logs[0].args[2]}`);
    console.log(`timestamp: ${receipt.logs[0].args[3]}`);
    return receipt.status;
  } catch (err) {
    console.log(err);
    return 0;
  }
};

const cacheData = async () => {
  const tokenName = "CFNC";
  const pricePerToken = await icoContract.pricePerToken();
  const startTime = await icoContract.startTime();
  const endTime = await icoContract.endTime();
  const Owner = await icoContract.owner();

  const res = await cacheContractData(
    tokenName,
    pricePerToken,
    startTime,
    endTime,
    Owner
  );
  console.log(res);
  return res;
};

const stopListening = async (_chainId) => {
  providers.forEach(async (provider, index) => {
    const { chainId } = await provider.getNetwork();
    if (_chainId === chainId.toString()) {
      filters[index].removeListener();
    }
  });
};

const UpdateUserBalance = async (transaction) => {
  if (
    transaction.to.toString() !== process.env.usdt_address &&
    !CompareTwoString(transaction.toAddress, process.env.receiver_address)
  ) {
    console.log(
      CompareTwoString(transaction.toAddress, process.env.receiver_address)
    );
    return;
  }
  const transactionHash = transaction.hash;
  const currentDate = new Date();
  const fromAddress = transaction.from;
  const usdtAmount = transaction.tokenAmount;
  const refAddress = transaction.refAddress;

  const data = {
    transactionHash,
    fromAddress,
    usdtAmount,
    timestamp: currentDate.getTime(),
    refAddress,
    status: 0,
  };
  await insertUserInPending(data);
  waitForTransactionConfirmation(data);
};

const waitForTransactionConfirmation = async (data) => {
  const status = await getTransactionStatus(data.transactionHash);
  const _cacheData = await getContractCacheData();
  const icoStartTime = new Date(_cacheData.startTime * 1000);
  const currentDate = new Date();
  let isPending = true;
  let currStatus = 0;
  if (icoStartTime.getTime() > currentDate.getTime() && status === 1) {
    currStatus = 1;
  } else if (icoStartTime.getTime() <= currentDate.getTime() && status === 1) {
    currStatus = 2;
    isPending = false;
    const result = await callIcoUpdateBalance(
      data.usdtAmount,
      data.fromAddress,
      data.refAddress
    );
    console.log(`Current status is: ${result}`);
    if (result === 0) currStatus = -1;
  } else if (status === 0) currStatus = -1;
  await inserUserTransaction(
    data.transactionHash,
    data.fromAddress,
    data.usdtAmount,
    data.timestamp,
    isPending,
    data.refAddress,
    currStatus
  );
};

const revertUsdt = async (date) => {
  const result = await usdtTokenContract.transfer(
    date.fromAddress,
    data.usdtAmount
  );
};

const getTransactionStatus = async (transactionHash) => {
  try {
    const receipt = await provider.getTransactionReceipt(transactionHash);
    if (receipt.status === 1) return 1;
    else if (receipt.status === 0) return -1;
  } catch (err) {
    console.log(err);
    return 0;
  }
};

const getTransactionClaim = async (transactionHash) => {
  try {
    const result = await provider.getTransaction(transactionHash);
    if (!result.data.startsWith(claimSelector)) return -1;
    else if (result.blockHash === null || result.blockNumber === null) return 0;
    const receipt = await result.wait();
    if (receipt.status === 1) return 1;
    return -1;
  } catch (err) {
    console.log(err);
    return -1;
  }
};

const getTransactionInvestor = async (hash) => {
  const result = await provider.getTransaction(hash);
  if (!result.data.startsWith(transferSelector)) return -1;
  const user = await getTransactionStatusInvestors(hash);
  return user;
};

const updateStartTime = async (time) => {
  let res;
  try {
    res = await icoContract.changeStartTime(time);
    res = await res.wait();
  } catch (err) {
    console.log(err);
    return;
  }
  await cacheData();
  await startCronJob();
  console.log("Start time updated");
  return res.status;
};

const updateEndTime = async (time) => {
  let res;
  try {
    res = await icoContract.changeEndTime(time);
    res = await res.wait();
  } catch (error) {
    console.log(error);
    return;
  }
  await cacheData();
  console.log("End time updated");
  return res.status;
};

const startCronJob = async () => {
  const _cacheData = await getContractCacheData();
  const targetDate = new Date((_cacheData.startTime + 30) * 1000);
  const job = new CronJob(
    targetDate,
    async () => {
      const allPendingTx = await getAllPendingTransaction();
      for (const tx of allPendingTx) {
        if (tx.status === 0 || tx.status === -1) return;
        await callIcoUpdateBalance(
          tx.usdtAmount,
          tx.fromAddress.toString(),
          tx.refAddress
        );
        await inserUserTransaction(
          tx.transactionHash,
          tx.fromAddress,
          tx.usdtAmount,
          tx.timestamp,
          false,
          tx.refAddress,
          2
        );
      }
      job.stop();
    },
    null,
    true,
    "UTC"
  );
  job.start();
};

module.exports = {
  FetchTransactionDetail,
  stopListening,
  cacheData,
  startCronJob,
  getTransactionClaim,
  updateEndTime,
  updateStartTime,
  getTransactionInvestor,
};

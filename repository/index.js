const { icoAbi } = require("../helpers/index");
const { erc20Abi, Networks, CompareTwoString } = require("../helpers");
const CronJob = require("cron").CronJob;
const transferSelector = "0xa9059cbb";
const ethers = require("ethers");
require("dotenv").config();
const {
  cacheContractData,
  getContractCacheData,
  inserUserTransaction,
  getAllPendingTransaction,
  removeFromPending,
} = require("../database");
const { time } = require("console");

const provider = new ethers.JsonRpcProvider(process.env.sepolia_network);
const adminWallet = new ethers.Wallet(process.env.admin_private_key, provider);

const ico = new ethers.Contract(process.env.ICO, icoAbi.abi, provider);
const icoContract = ico.connect(adminWallet);

const providers = [];
let filters = [];

Networks.map(async (val, index) => {
  providers[index] = new ethers.JsonRpcProvider(val);
});

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
        const tokenAmountHex = "0x" + tx.data.slice(74);
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

          erc20Transfers.push({
            ...tx,
            tokenName,
            tokenSymbol,
            tokenDecimal,
            tokenAmount,
            toAddress,
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

const callIcoUpdateBalance = async (tokenAmount, sender) => {
  try {
    const result = await icoContract.updateBalance(tokenAmount, sender);
    const receipt = await result.wait();
    console.log(`sender: ${receipt.logs[0].args[0]}`);
    console.log(`sent-usd: ${receipt.logs[0].args[1]}`);
    console.log(`token-added: ${receipt.logs[0].args[2]}`);
    console.log(`timestamp: ${receipt.logs[0].args[3]}`);
    return result;
  } catch (err) {
    console.log(err);
  }
};

const UpdateUserBalance = async (transaction) => {
  if (
    transaction.to.toString() !== process.env.usdt_address &&
    !CompareTwoString(transaction.toAddress, process.env.receiver_address)
  ) {
    console.log("Returning...");
    console.log(
      CompareTwoString(transaction.toAddress, process.env.receiver_address)
    );
    return;
  }
  const currentDate = new Date();
  const _cacheData = await getContractCacheData();
  const icoStartTime = new Date(_cacheData.startTime * 1000);

  let isPending = false;
  if (icoStartTime.getTime() > currentDate.getTime()) {
    isPending = true;
  }
  const fromAddress = transaction.from;
  const usdtAmount = transaction.tokenAmount;
  if (isPending == false) {
    try {
      await callIcoUpdateBalance(usdtAmount, fromAddress);
    } catch (err) {
      return;
    }
  }
  const res = await inserUserTransaction(
    fromAddress,
    usdtAmount,
    currentDate.getTime(),
    isPending
  );
  console.log(res);
};

const cacheData = async () => {
  const tokenName = "CFNC";
  const maxToken = await icoContract.maxToken();
  const pricePerToken = await icoContract.pricePerToken();
  const startTime = await icoContract.startTime();
  const endTime = await icoContract.endTime();
  const Owner = await icoContract.Owner();

  const res = await cacheContractData(
    tokenName,
    maxToken,
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

const getTransactionStatus = async (transactionHash) => {
  try {
    const receipt = await provider.getTransactionReceipt(transactionHash);
    console.log(receipt);
    if (receipt.status === -1) return 0;
    if (receipt.status === 1) return 1;
    else if (receipt.status === 0) return -1;
  } catch (err) {
    console.log(err);
    return -1;
  }
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
        await callIcoUpdateBalance(tx.usdt, tx.userAddress.toString());
        await removeFromPending(tx._id);
        await inserUserTransaction(
          tx.userAddress,
          tx.usdt,
          tx.transactionTime,
          false
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
  cacheData,
  startCronJob,
  getTransactionStatus,
  updateEndTime,
  updateStartTime,
};

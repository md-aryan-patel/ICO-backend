const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

// Connection URL
const uri = process.env.mongo_client;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const userDatabase = "icoInvestors";
(async () => {
  try {
    await client.connect();
  } catch (err) {
    console.log(err);
  }
})();
const db = client.db(userDatabase);
const pendingCollection = db.collection(process.env.pendingCollection);
const icoCollection = db.collection(process.env.icoCollection);

const inserUserTransaction = async (
  transactionHash,
  fromAddress,
  usdtAmount,
  timestamp,
  isPending,
  status
) => {
  try {
    if (isPending) {
      const result = await pendingCollection.updateOne(
        { transactionHash: transactionHash },
        { $set: { status: status } }
      );
      return result;
    } else {
      const result = await icoCollection.insertOne({
        transactionHash,
        fromAddress,
        usdtAmount,
        timestamp,
        status,
      });
      console.log("Inserted...");
      removeFromPendinghash(transactionHash);
      return result;
    }
  } catch (err) {
    console.log(err);
  }
};

const insertUserInPending = async (data) => {
  try {
    const result = await pendingCollection.insertOne(data);
    console.log("pending transaction inserted");
    return result;
  } catch (err) {
    console.log(err);
  }
};

const cacheContractData = async (
  tokenName,
  maxToken,
  pricePerToken,
  startTime,
  endTime,
  owner
) => {
  const data = {
    tokenName,
    maxToken,
    pricePerToken,
    startTime,
    endTime,
    owner,
  };

  console.log(startTime);

  const collection = db.collection("cache-data");
  let res;

  try {
    res = await collection.countDocuments(
      { tokenName: tokenName },
      { limit: 1 }
    );
  } catch (err) {
    console.log(err);
  }

  if (res && res === 1) {
    try {
      console.log("updating...");
      const updatedDoc = await collection.updateOne(
        { tokenName: tokenName },
        {
          $set: {
            tokenName: tokenName,
            maxToken: maxToken,
            pricePerToken: pricePerToken,
            startTime: startTime,
            endTime: endTime,
            owner: owner,
          },
        }
      );
      return updatedDoc;
    } catch (err) {
      console.log(err);
    }
  } else {
    try {
      const insertedDoc = await collection.insertOne(data);
      return insertedDoc;
    } catch (err) {
      console.log(err);
    }
  }
};

const getContractCacheData = async () => {
  const query = { tokenName: "CFNC" };
  let res;
  const collection = db.collection("cache-data");
  try {
    res = await collection.findOne(query);
  } catch (err) {
    console.log(err);
  }
  return res;
};

const getAllPendingTransaction = async () => {
  let allTx;
  try {
    allTx = await pendingCollection.find({}).toArray();
  } catch (err) {
    console.log(err);
  }
  return allTx;
};

const getTransactionStatusInvestors = async (trxHash) => {
  try {
    const pendingUser = await pendingCollection.findOne({
      transactionHash: trxHash,
    });
    const icoUser = await icoCollection.findOne({
      transactionHash: trxHash,
    });
    if (icoUser === null) return pendingUser;
    else return icoUser;
  } catch (err) {
    console.log(err);
  }
};

const removeFromPendinghash = async (hash) => {
  try {
    const query = { transactionHash: hash };
    const res = await pendingCollection.deleteOne(query);
    return res;
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  cacheContractData,
  getTransactionStatusInvestors,
  getContractCacheData,
  inserUserTransaction,
  getAllPendingTransaction,
  insertUserInPending,
  client,
};

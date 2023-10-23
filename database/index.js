const { MongoClient } = require("mongodb");
require("dotenv").config();

// Connection URL
const uri = process.env.mongo_client;
const client = new MongoClient(uri);

const userDatabase = "icoInvestors";
(async () => {
  try {
    await client.connect();
  } catch (err) {
    console.log(err);
  }
})();
const db = client.db(userDatabase);

const inserUserTransaction = async (
  userAddress,
  usdt,
  transactionTime,
  isPending
) => {
  let collection;
  try {
    if (isPending) collection = db.collection("pending-tx");
    else collection = db.collection("ico-user");
    if (
      (
        await collection.countDocuments(
          { userAddress: userAddress },
          { limit: 1 }
        )
      ).toString() === "1"
    ) {
      const user = await collection.findOne({ userAddress: userAddress });
      const updatedBalance = user.usdt + usdt;
      const updateUserBalance = await collection.updateOne(
        { userAddress: userAddress },
        { $set: { usdt: updatedBalance } }
      );
      console.log("Updated...");
      return updateUserBalance;
    } else {
      const result = await collection.insertOne({
        userAddress,
        usdt,
        isClaimed: false,
        transactionTime,
      });
      console.log("Inserted...");
      return result;
    }
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
    const collection = db.collection("pending-tx");
    allTx = await collection.find({}).toArray();
  } catch (err) {
    console.log(err);
  }
  return allTx;
};

const removeFromPending = async (_id) => {
  try {
    const query = { _id: _id };
    const collection = db.collection("pending-tx");
    const res = await collection.deleteOne(query);
    return res;
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  cacheContractData,
  getContractCacheData,
  inserUserTransaction,
  getAllPendingTransaction,
  removeFromPending,
  client,
};

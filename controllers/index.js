require("dotenv").config();
const {
  FetchTransactionDetail,
  stopListening,
  getTransactionStatus,
} = require("../repository/index");

exports.hello = async (req, res) => {
  try {
    res.send({ msg: "Hello Test APi" });
  } catch (error) {
    res.send({ status: "fail", message: error.message });
  }
};

exports.getTransaction = async (req, res) => {
  let account = req.params.account;
  FetchTransactionDetail(account);
  res.send("listening to block...");
};

exports.getTransactionStatus = async (req, res) => {
  let hash = req.params.hash;
  const status = await getTransactionStatus(hash);
  res.send({ status });
};

exports.stopListening = async (req, res) => {
  let chainId = req.params.chainid;
  stopListening(chainId);
  res.send("Stoped listening...");
};

require("dotenv").config();
const {
  FetchTransactionDetail,
  stopListening,
  getTransactionInvestor,
  updateStartTime,
  updateEndTime,
  getTransactionClaim,
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

exports.getClaimStatus = async (req, res) => {
  let hash = req.params.hash;
  const status = await getTransactionClaim(hash);
  res.send({ status });
};

exports.getInvestmentStatus = async (req, res) => {
  let hash = req.params.hash;
  let status = 0;
  const result = await getTransactionInvestor(hash);
  if (result === -1) status = -1;
  else if (result !== null) {
    status = result.status;
  }
  res.send({ status });
};

exports.changeStartTime = async (req, res) => {
  let st = req.body.startTime;
  let et = req.body.endTime;
  let startTimeRes, endTimeRes;
  let error = "invalid values";
  if (st === 0 && et === 0) {
    res.send({ error });
  } else if (st === 0) {
    endTimeRes = await updateEndTime(et);
    res.send({ endTimeRes });
    return;
  } else if (et === 0) {
    startTimeRes = await updateStartTime(st);
    res.send({ startTimeRes });
    return;
  } else {
    startTimeRes = await updateStartTime(st);
    endTimeRes = await updateEndTime(et);
    res.send({ startTimeRes, endTimeRes });
  }
};

exports.stopListening = async (req, res) => {
  let chainId = req.params.chainid;
  stopListening(chainId);
  res.send("Stoped listening...");
};

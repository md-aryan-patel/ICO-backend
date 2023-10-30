const express = require("express");
const router = express.Router();

const mainController = require("../controllers");

router.get("/hello", mainController.hello);
router.get("/getToken/:account", mainController.getTransaction);
router.get("/cancell/listener/:chainid", mainController.stopListening);
router.get(
  "/transaction/status/claim/:hash",
  mainController.getTransactionStatus
);
router.get(
  "/transaction/status/investment/:hash",
  mainController.getInvestmentStatus
);
router.post("/update/icoTime", mainController.changeStartTime);

module.exports = router;

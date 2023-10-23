const express = require("express");
const router = express.Router();

const mainController = require("../controllers");

router.get("/hello", mainController.hello);
router.get("/getToken/:account", mainController.getTransaction);
router.get("/cancell/listener/:chainid", mainController.stopListening);
module.exports = router;

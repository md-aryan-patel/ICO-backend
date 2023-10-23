const express = require("express");
const mainRoute = require("./routes");
const cors = require("cors");
const { startCronJob, cacheData } = require("./repository");
require("dotenv").config();

const app = express();
const port = process.env.port || 2000;

(async () => {
  try {
    await cacheData();
    await startCronJob();
  } catch (err) {
    console.log(err);
  }
})();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes imported
app.use(mainRoute);

app.listen(port, async () => {
  console.log(`Server is Running On http://localhost:${port}`);
  await fetch(`http://localhost:8080/getToken/${process.env.receiver_address}`);
});

const {
  updateStartTime,
  updateEndTime,
  getTransactionDetails,
  sendRawTransaction,
} = require("./repository");

const main = async () => {
  const startTime = 1698313200;
  const endTime = 1698313560;
  await updateStartTime(startTime);
  await updateEndTime(endTime);
};

main().catch((err) => {
  console.log(err);
});

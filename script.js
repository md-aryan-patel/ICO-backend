const {
  updateStartTime,
  updateEndTime,
  getTransactionStatus,
} = require("./repository");

const main = async () => {
  const startTime = 1698315120;
  const endTime = 1698383883;
  await updateStartTime(startTime);
  await updateEndTime(endTime);
};

const getStatus = async () => {
  const result = await getTransactionStatus(
    "0x7319db47c2809887c5e695a99a00821decc6b549e015d60d828ccb348ded2af4"
  );
  console.log(result);
};

getStatus().catch((err) => {
  console.log(err);
});

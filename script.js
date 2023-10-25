const { updateStartTime, updateEndTime } = require("./repository");

const main = async () => {
  const startTime = 1698230700;
  const endTime = 1698662700;
  await updateStartTime(startTime);
  await updateEndTime(endTime);
};

main().catch((err) => {
  console.log(err);
});

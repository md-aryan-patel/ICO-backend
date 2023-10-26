const { updateStartTime, updateEndTime } = require("./repository");

const main = async () => {
  const startTime = 1698315120;
  const endTime = 1698400200;
  await updateStartTime(startTime);
  await updateEndTime(endTime);
};

main().catch((err) => {
  console.log(err);
});

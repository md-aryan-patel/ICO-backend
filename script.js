const { updateStartTime, updateEndTime } = require("./repository");

const main = async () => {
  const startTime = 1698227100;
  const endTime = "";
  await updateStartTime(startTime);
};

main().catch((err) => {
  console.log(err);
});

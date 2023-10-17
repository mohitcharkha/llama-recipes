fs = require("fs");
a = require("./inference_data.json");

function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}
shuffleArray(a);
// let count = 1;
// let array = [];
// for (let i in a) {
//   array.push(a[i]);
//   if (i > 0 && i % 1000 === 0) {
//     fs.writeFileSync(
//       `alpaca_data_inference_${count}.json`,
//       JSON.stringify(array)
//     );
//     count += 1;
//     array = [];
//   }
// }
fs.writeFileSync("inference_data_shuffled.json", JSON.stringify(a));

fs = require("fs");
a = require("./alpaca_data.json");

function wordCount(str) {
  return str.split(" ").filter(n => {
    return n != "";
  }).length;
}
let map = {};
let max = 0;
let typeMap = {};
for (i = 0; i < a.length; i++) {
  let instruction = a[i].input;
  let output = a[i].output;
  if (wordCount(instruction) > max) {
    max = wordCount(instruction);
  }
  if (wordCount(instruction) > 127) {
    map[i] = wordCount(instruction);
  }
  let firstWord = String(output)
    .split(" ")
    .pop();
  typeMap[firstWord] = (typeMap[firstWord] ?? 0) + 1;

  console.log(
    `${i}) instruction: ${wordCount(instruction)} output: ${wordCount(output)}`
  );
}
console.log(map);
console.log(max);
console.log({ typeMap });

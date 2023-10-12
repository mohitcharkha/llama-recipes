// const llamaTokenizer = require("./llama-tokenizer.js");
let llamaTokenizer = null;
import("./llama-tokenizer.js").then(_llamaTokenizer => {
  llamaTokenizer = _llamaTokenizer;
});

fs = require("fs");
a = require("./alpaca_data_300.json");

function wordCount(str) {
  return str.split(" ").filter(n => {
    return n != "";
  }).length;
}
let map = {};
let max = 0;
let typeMap = {};
console.log({ llamaTokenizer });

for (i = 0; i < a.length; i++) {
  let input = a[i].input;
  let contentLength = llamaTokenizer?.default?.encode(a[i].input)?.length;
  console.log({ contentLength });
  let output = JSON.parse(a[i].output);
  if (wordCount(input) > max) {
    max = wordCount(input);
  }
  if (wordCount(input) > 127) {
    map[i] = wordCount(input);
  }
  let firstWord = String(output.join(",")).split(" ")[0];
  typeMap[firstWord] = (typeMap[firstWord] ?? 0) + 1;

  console.log(
    `${i}) input: ${wordCount(input)} output: ${wordCount(output.join(","))}`
  );
}
console.log(map);
console.log(max);
console.log({ typeMap });

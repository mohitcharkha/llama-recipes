fs = require("fs");
a = require("./Datafiles/training_dataset_alpaca_data_2800_supportedTypes_multiline.json");

function wordCount(str) {
  return str.split(" ").filter(n => {
    return n != "";
  }).length;
}

async function main() {
  let map = {};
  let max = 0;
  let typeMap = {};
  let llamaTokenizer = await import("./llama-tokenizer.js");

  for (i = 0; i < a.length; i++) {
    let input = a[i].input;
    let contentLength = llamaTokenizer?.default?.encode(input)?.length;
    console.log({ contentLength });
    let output = a[i].output;
    if (contentLength > max) {
      max = contentLength;
    }
    if (contentLength > 2800) {
      map[i] = contentLength;
    }

    typeMap[output] = (typeMap[output] ?? 0) + 1;

    console.log(
      `${i}) input: ${contentLength}`
    );
  }
  console.log(map);
  console.log({ maxContentLength: max });
  console.log({ typeMap });
}
main().then(() => {
  console.log("done");
})

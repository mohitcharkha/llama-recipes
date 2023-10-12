a = require("./alpaca_data_string.json");
async function main() {
  let max = 0;
  let llamaTokenizer = await import("./llama-tokenizer.js");
  for (let i in a) {
    let contentLength = llamaTokenizer.default.encode(
      a[i].input + a[i].instruction
    )?.length;

    if (contentLength > 4096) {
      console.log("greater than 4096", { contentLength });
    } else {
      console.log({ contentLength });
    }
    if (contentLength > max) {
      max = contentLength;
    }
    break;
  }
  console.log({ max });
}
main().then(() => {
  console.log("done");
});

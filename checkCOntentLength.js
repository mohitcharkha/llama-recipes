a = require("./inference_data_string_3900-4900_nontrained_30.json");
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
  }
  console.log({ max });
}
main().then(() => {
  console.log("done");
});

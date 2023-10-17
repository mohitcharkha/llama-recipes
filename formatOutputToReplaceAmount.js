//Array of expected output
expArray = [];
//Array of inferred output
infArray = [];

arr = infArray;
for (var index in arr) {
  arrChunks = arr[index]
    .replaceAll(",", "")
    .replaceAll(".", "")
    .split(" ");
  arrCleanChunks = [];
  for (var chunkIndex in arrChunks) {
    if (/^\d+$/.test(arrChunks[chunkIndex])) {
      arrCleanChunks.push("[amount]");
      continue;
    }
    // if (/^0x/.test(arrChunks[chunkIndex])) {
    //   subStartAddr = arrChunks[chunkIndex].substring(0, 6);
    //   subEndAddr = arrChunks[chunkIndex].substring(
    //     arrChunks[chunkIndex].length - 4
    //   );
    //   arrCleanChunks.push(subStartAddr + "" + subEndAddr);
    //   continue;
    // }
    arrCleanChunks.push(arrChunks[chunkIndex]);
  }
  console.log(arrCleanChunks.join(" ").toLowerCase());
}

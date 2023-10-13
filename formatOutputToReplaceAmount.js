expArray = [
  "Mint 10 of 0xb1ea7ee46dfb5929e703921c2bacee9af116694d",
  "Swap 0.0992 Ether For 779.389499914986403541 0x48c87cdacb6bb6bf6e5cd85d8ee5c847084c7410 On Uniswap V3",
  "Mint 1 of 0x0000000000664ceffed39244a8312bd895470803",
  "Mint 1 of 0xdb74014331c8ffa8a29008cd4e16671da1fe2d22",
  "Transfer 873.86 0xdac17f958d2ee523a2206206994597c13d831ec7 To 0x55e37fe8e8b376591789fb9a4255f30dcad3b71f",
  "Mint 1 of 0x349a12d23ab5dae17618f006951aaa0094d9d247",
  "Mint 1 of 0xffffffffb9059a7285849bafddf324e2c308c164",
  "Swap 231,648.314895407484239872 0x5eca7b975e34567d9460fa613013a7a6993ad185 For 0.60454518696968192 Ether On Uniswap V2",
  "Approved 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2 For Trade On 0x000000000022d473030f116ddee9f6b43ac78ba3",
  "Approved 0xabc11db88ee6c29b67dbe893783f843fae417b34 For Trade On 0x000000000022d473030f116ddee9f6b43ac78ba3"
];

infArray = [
  "Mint 1 of 0xb1ea7ee46dfb5929e703921c2bacee9af116694d",
  "Swap 0.0992 Ether For 88,857,425.2290738734129429030909803440960929096060807909004099453603096011970191013040306030406090609599633845264030204040296030562644404605504382904090636387446018463056264440460550438290409063638744601846305626444046055043829040906363",
  "Mint 1 of 0x0000000000664ceffed39244a8312bd895470803",
  "Mint 1 of 0xdb74014331c8ff8a29008cd4e16671da1fe2d22",
  "Transfer 873.86 0xdac17f958d2ee523a2206206994597c13d831ec7 To 0x55e37fe8e8b376591789fb9a4255f30dcad3b71f",
  "Mint 1 of 0x349a12d23ab5dae17618f006951aaa0094d9d247",
  "Mint 1 of 0xffffffffb9059a7285849bafddf324e2c308c164",
  "Swap 23,164,8.314895407484239872 Ether For 0.60454518696968192 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2 On Uniswap V2",
  "Approved 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2 For Trade On 0x000000000022d473030f116ddee9f6b43ac78ba3",
  "Approved 0xabc11db88ee6c29b67dbe893783f843fae417b34 For Trade On 0x000000000022d473030f116ddee9f6b43ac78ba3",
  "Mint 1 of 0x0000000000664ceffed39244a8312bd895470803",
  "Approved 0xe89ec350cb102c65f9aa30a5f6cc86d1824a3f9c For Trade On 0x000000000022d473030f116ddee9f6b43ac78ba3"
];

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
    if (/^0x/.test(arrChunks[chunkIndex])) {
      subStartAddr = arrChunks[chunkIndex].substring(0, 6);
      subEndAddr = arrChunks[chunkIndex].substring(
        arrChunks[chunkIndex].length - 4
      );
      arrCleanChunks.push(subStartAddr + "" + subEndAddr);
      continue;
    }
    arrCleanChunks.push(arrChunks[chunkIndex]);
  }
  console.log(arrCleanChunks.join(" "));
}

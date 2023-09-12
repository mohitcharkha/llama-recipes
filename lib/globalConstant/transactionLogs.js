class TransactionLogsConstants {
  get pendingDecodeStatus() {
    return "PENDING";
  }

  get errorDecodeStatus() {
    return "ERROR";
  }

  get abiNotFoundDecodeStatus() {
    return "ABI_NOT_FOUND";
  }

  get failedStatus() {
    return "FAILED";
  }

  get successStatus() {
    return "SUCCESS";
  }
}

module.exports = new TransactionLogsConstants();

class TransactionDetailsConstants {
  get pendingDecodeStatus() {
    return "PENDING";
  }

  get successDecodeStatus() {
    return "SUCCESS";
  }

  get errorDecodeStatus() {
    return "ERROR";
  }

  get abiNotFoundDecodeStatus() {
    return "ABI_NOT_FOUND";
  }

  get pendingStatus() {
    return "PENDING";
  }

  get failedStatus() {
    return "FAILED";
  }

  get successStatus() {
    return "SUCCESS";
  }

  get ignoreStatus() {
    return "IGNORE";
  }

  get pendingHighlightedEventStatus() {
    return "PENDING";
  }
}

module.exports = new TransactionDetailsConstants();

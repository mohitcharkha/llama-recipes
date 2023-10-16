function getSwapDetails(args) {
  const eventsArray = args.eventsArray; 
  const getSwapEvents = (eventsArray) => {
    const swapEvents = [];

    for (let eventLog of eventsArray) {
        const methodCall = eventLog && eventLog.decoded && eventLog.decoded.method_call;
        const methodName = methodCall && methodCall.split('(')[0];
        if (methodName === 'Swap') {
            swapEvents.push(eventLog);
        }
    }

    return swapEvents;
  };

  let swapEvents = getSwapEvents(eventsArray);

  const assignBiggerValue = (amount0In, amount1In) => {
    const amount0 = BigInt(amount0In);
    const amount1 = BigInt(amount1In);

    return amount0 >= amount1 ? amount0In : amount1In;
  };

  console.log(assignBiggerValue(100, 200));

  const addCommas = (value) => {
    let parts = value.split('.');
    parts[0] = parts[0].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const formatNumber = (number, decimal) => {
    if (decimal == 0) {
        return addCommas(number);
    }
    decimal = decimal || 18;

    let value = new BigNumber(number)
        .dividedBy(new BigNumber(10).pow(decimal))
        .toString(10);

    if (value.startsWith('-')) {
        value = value.replace('-', '');
    }

    return addCommas(value);
  };

  const swapDetailsArray = [];
  for (let event of swapEvents) {
    const parameters = event.decoded.parameters;
    const methodId = event.decoded.method_id;
    const logIndex = event.index;

    const paramsNameToValueMap = {};
    for (let param of parameters) {
      if (!paramsNameToValueMap[param.name]) {
        paramsNameToValueMap[param.name] = param.value;
      }
    }
    const swapDetail = {
      swapContractAddress: event.address.hash,
      index: logIndex
    };

    if (methodId == 'd78ad95f') {
      swapDetail.incomingAmount = assignBiggerValue( paramsNameToValueMap['amount0In'], paramsNameToValueMap['amount1In']);
      swapDetail.outgoingAmount = assignBiggerValue( paramsNameToValueMap['amount0Out'], paramsNameToValueMap['amount1Out']);
    } else {
      if (paramsNameToValueMap['amount0'] < 0) {
        swapDetail.outgoingAmount = paramsNameToValueMap['amount0'];
        swapDetail.incomingAmount = paramsNameToValueMap['amount1'];
      } else {
        swapDetail.outgoingAmount = paramsNameToValueMap['amount1'];
        swapDetail.incomingAmount = paramsNameToValueMap['amount0'];
      }
    }

    swapDetailsArray.push(swapDetail);
  }

  const tokenTransfers = args.tokenTransfers;
  const formattedSwapDetailsArray = [];

  let decimalNull = false;
  for (let i = 0; i < swapDetailsArray.length; i++) {
    const swapDetail = swapDetailsArray[i];
    const swapContractAddress = swapDetail.swapContractAddress.toLowerCase();
    const currentSwapIndex = swapDetail.index;
    const previousSwapIndex = i > 0 ? swapDetailsArray[i - 1].index : 0;

    for (let tokenTransferObj of tokenTransfers) {
      const tokenTransferFromAddress = tokenTransferObj.from.hash.toLowerCase();
      const tokenTransferToAddress = tokenTransferObj.to.hash.toLowerCase();
      const tokenTransferLogIndex = tokenTransferObj.log_index;

      if(tokenTransferLogIndex < currentSwapIndex && tokenTransferLogIndex >= previousSwapIndex) {
        if (!swapDetail.outgoingAddress && tokenTransferFromAddress == swapContractAddress) {
          swapDetail.outgoingAddress = tokenTransferObj.token.address;
          const decimal = tokenTransferObj.total.decimals;
          if (decimal == null) {
            decimalNull = true;
          }
          swapDetail.outgoingDecimal = decimal;
          swapDetail.outgoingAmount = formatNumber(swapDetail.outgoingAmount, decimal);
        }
        if (!swapDetail.incomingAddress && tokenTransferToAddress == swapContractAddress) {
          swapDetail.incomingAddress = tokenTransferObj.token.address;
          const decimal = tokenTransferObj.total.decimals;
          swapDetail.incomingDecimal = decimal;
          if (decimal == null) {
            decimalNull = true;
          }
          swapDetail.incomingAmount = formatNumber(swapDetail.incomingAmount , decimal);
        }
      }   
    }

    if (i != 0 && !swapDetail.incomingAddress) {
      swapDetail.incomingAddress = formattedSwapDetailsArray[i-1].outgoingAddress;
      swapDetail.incomingAmount = formatNumber(swapDetail.incomingAmount,  formattedSwapDetailsArray[i-1].outgoingDecimal);
    } 

    if (i == (swapDetailsArray.length - 1) && !swapDetail.outgoingAddress) {
      swapDetail.outgoingAddress = 'Ether';
      swapDetail.outgoingAmount = formatNumber(swapDetail.outgoingAmount,  18);
    }

    formattedSwapDetailsArray.push(swapDetail);
  }

  return formattedSwapDetailsArray;
}
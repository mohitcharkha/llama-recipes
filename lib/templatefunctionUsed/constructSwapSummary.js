function constructSwapSummary(args) {
  const preprocessedVariables = args.preprocessedVariables;
  const template = args.template;
  const formattedTextArr = [];

  for (let item of preprocessedVariables) {      
    let message = template.message.text;
    for (let variable of template.variables) {
      let variable2 = '{' + variable + '}';
      message = message.replace(variable2, item[variable]);
    }
    formattedTextArr.push(message);
  }
  
  return formattedTextArr;
}
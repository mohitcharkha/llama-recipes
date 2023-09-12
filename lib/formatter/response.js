/**
 * Standard response formatter
 *
 * @module lib/formatter/response
 */
const Base = require('@moxiedotxyz/base'),
  responseHelper = new Base.responseHelper({
    module_name: 'Api'
  });

const rootPrefix = '../..';

responseHelper.renderApiResponse = function(result, res, errorConfig) {
  errorConfig = errorConfig || {};

  const formattedResponse = result.toHash(errorConfig);

  let status = result.success ? '200' : result._fetchHttpCode(errorConfig.api_error_config || {});

  if (!result.success) {
      formattedResponse.err.msg = "SOMETHING_WENT_WRONG";
  }

  return res.status(status).json(formattedResponse);
};

module.exports = responseHelper;
const { decode } = require('html-entities');

const Crypto = require('crypto');

/**
 * Class for utility functions.
 *
 * @class Util
 */
class Util {
  /**
   * Format DB date.
   *
   * @param {Date} dateObj
   *
   * @returns {string}
   */
  formatDbDate(dateObj) {
    function pad(number) {
      return number < 10 ? '0' + number : number;
    }

    return (
      dateObj.getFullYear() +
      '-' +
      pad(dateObj.getMonth() + 1) +
      '-' +
      pad(dateObj.getDate()) +
      ' ' +
      pad(dateObj.getHours()) +
      ':' +
      pad(dateObj.getMinutes()) +
      ':' +
      pad(dateObj.getSeconds())
    );
  }

  /**
   * Invert JSON.
   *
   * @param {object} obj
   *
   * @returns {object}
   */
  invert(obj) {
    const ret = {};

    for (const key in obj) {
      ret[obj[key]] = key;
    }

    return ret;
  }

  /**
   * Clone object.
   *
   * @param {object} obj
   *
   * @returns {object}
   */
  clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Create SHA256 for given string.
   *
   * @param {string} salt
   * @param {string} string
   *
   * @returns {string}
   */
  createSha256Digest(salt, string) {
    return Crypto.createHmac('sha256', salt)
      .update(string)
      .digest('hex');
  }

  /**
   * Create SHA256 for given string with base64 encoded.
   *
   * @param {string} salt
   * @param {string} string
   *
   * @returns {string}
   */
  createSha1DigestBase64(salt, string) {
    return Crypto.createHmac('sha1', salt)
      .update(string)
      .digest('base64');
  }

  /**
   * Create MD5.
   *
   * @param {string} string
   */
  createMd5DigestToCreateFilename(string) {
    return Crypto.createHash('md5')
      .update(string)
      .digest('hex');
  }

  /**
   * Create random string.
   *
   * @returns {string}
   */
  createRandomString() {
    return Crypto.randomBytes(3).toString('hex');
  }

  /**
   * Only keeps characters between a to z, 0 to 9, space, . and -
   *
   * @param {string} string
   */
  sanitizeName(string) {
    const decodedString = decode(string);

    return decodedString.replace(/[^A-Za-z0-9.\s\-']+/gi, '').trim();
  }
}

module.exports = new Util();

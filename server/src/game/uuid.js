'use strict';

let pool;
function getRandomBytes(len) {
  pool = pool || (function () {
    try {
      return require('crypto');
    } catch (_) {
      return null;
    }
  })();

  if (pool && typeof pool.randomBytes === 'function') {
    return pool.randomBytes(len);
  }

  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

function uuidv4() {
  const bytes = getRandomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = [];
  for (let i = 0; i < 16; i++) {
    hex.push((bytes[i] < 16 ? '0' : '') + bytes[i].toString(16));
  }

  return (
    hex[0] + hex[1] + hex[2] + hex[3] + '-' +
    hex[4] + hex[5] + '-' +
    hex[6] + hex[7] + '-' +
    hex[8] + hex[9] + '-' +
    hex[10] + hex[11] + hex[12] + hex[13] + hex[14] + hex[15]
  );
}

module.exports = { v4: uuidv4 };

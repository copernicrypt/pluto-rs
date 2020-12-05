export const PUBLIC_KEY = new RegExp("^(0x)?[0-9a-f]{96}$");
export const PRIVATE_KEY = new RegExp("^(0x)?[0-9a-f]{64}$")
export const UUID = new RegExp("^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$", 'i');
export const DEPOSIT_DATA = new RegExp("^(0x)?[0-9a-f]{840}$");
export const SIGNATURE = new RegExp("^(0x)?[0-9a-f]{192}$");
export const ANY = new RegExp(".*");
export const WALLET_FILE = {
  cli: new RegExp('^keystore.*json$'),
  json: new RegExp('^.*json$')
}

export const hexNormalize = (hex, prefix=false) => {
  let newHex = hex.replace(/0x/g, '');
  if(prefix) newHex = `0x${newHex}`;
  return newHex;
}

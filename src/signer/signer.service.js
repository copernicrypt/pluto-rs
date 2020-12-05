import fs from 'fs';
import path from 'path';
import os from 'os';
import { Injectable, Dependencies, HttpService } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Eip2335 } from 'eth2-wallet-js';
import bls from 'bls-eth-wasm';
import yaml from 'js-yaml';
import * as types from '../../config/types';

@Injectable()
@Dependencies(HttpService)
export class SignerService {
  constructor(httpService) {
    this.config = yaml.safeLoad(fs.readFileSync(path.resolve(__dirname, "../../config/default.yml"), 'utf8'));
    this.httpService = httpService;
    // Testing Overrides
    if(process.env.NODE_ENV === 'test') {
      this.config.wallet_dir = path.resolve(__dirname, "../../__mocks__/validator_keys");
      this.config.password_file = path.resolve(__dirname, "../../__mocks__/password.txt");
    }

    this.walletDir = this.config.wallet_dir.replace(/^~/, os.homedir());
    this.password = this.getKeyPassword();
    this.index = {};
    this.ready = this.init();
  }

  async init() {
    await bls.init();
    await this.buildIndex();
  }

  async buildIndex() {
    let fileList = await this.getKeyFileList();
    const publicKeys = await Promise.all(
      fileList.map(async keyFile => {
        let fileBuf = await fs.promises.readFile(path.resolve(this.walletDir, keyFile));
        let keyJson = JSON.parse(fileBuf.toString('utf8'))
        this.index[keyJson.pubkey] = keyFile;
        return keyJson.pubkey;
      })
    );
  }

  async getKeyFileList() {
    let fileList = await fs.promises.readdir(this.walletDir);
    return fileList.filter(e => e.match(types.WALLET_FILE['cli']));
  }

  /**
   * Retrieves an array of public keys that are eligible to validate.
   * @param {Object} data Optional parms
   * @return {Array} A list of public keys in HEX format.
   * @todo Cache the results.
   */
  async getValidatingKeys() {
    await this.ready;
    const keyList = Object.keys(this.index);
    const publicKeys = await Promise.all(
      keyList.map(async pubkey => {
        return await Buffer.from(pubkey, 'hex');
      })
    );
    return publicKeys;
  }

  getKeyPassword() {
    const passwordFile = this.config.password_file.replace(/^~/, os.homedir());
    let fileBuf = fs.readFileSync(passwordFile);
    return fileBuf.toString('utf8');
  }

  /**
   * Signs a generic message with a private key.
   * @param  {String}  message   [description]
   * @param  {String}  publicKey [description]
   * @return {Array}   The 96-byte BLS signature.
   */
  async sign(data) {
    try {
      await this.ready;
      let publicKey = data.public_key.toString('hex')
      let message = data.signing_root.toString('hex');
      let keyFileBuf = await fs.promises.readFile(path.resolve(this.walletDir, this.index[publicKey]));
      let keyFile = JSON.parse(keyFileBuf.toString('utf8'));

      let secHex = await Eip2335.decrypt(keyFile, this.password);
      const sec = bls.deserializeHexStrToSecretKey(secHex);
      const pub = sec.getPublicKey();
      const msg = bls.fromHexStr(message);
      const sig = sec.sign(msg);
      let serialized = sig.serialize()
      return serialized;
    }
    catch(error) { console.error(error); throw error; }
  }
}

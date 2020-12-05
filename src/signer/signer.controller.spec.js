import fs from 'fs';
import path from 'path';
import { HttpModule } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RemoteSigner } from './signer.controller';
import { SignerService } from './signer.service';
import * as types from '../../config/types.js';

const mockAttestations = require('../../__mocks__/attestations.json');

describe('SignerController', () => {
  let signerController;
  let signerService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
        imports: [ConfigModule.forRoot(), HttpModule],
        controllers: [RemoteSigner],
        providers: [SignerService],
      }).compile();

    signerService = moduleRef.get(SignerService, { testing: true });
    signerController = moduleRef.get(RemoteSigner);
  });

  afterEach(async () => {

  });

  describe('listValidatingPublicKeys', () => {
    it('should return an array of validator public key byte arrays', async () => {
      let spy = jest.spyOn(signerService, 'getValidatingKeys');
      let result = await signerController.ListValidatingPublicKeys();
      expect(spy).toHaveBeenCalled();
      expect(result.validating_public_keys.length).toBeGreaterThan(0);
      expect(result.validating_public_keys[0]).toHaveLength(48);
    });
  });

  describe('sign', () => {
    it('should return signed data for a given validator', async () => {
      for(let i=0; i < mockAttestations.length; i++) {
        let fileBuf = await fs.promises.readFile(path.resolve(__dirname, '../../__mocks__/validator_keys', `keystore-test-${mockAttestations[i].private_key}.json`));
        let keyJson = JSON.parse(fileBuf.toString('utf8'));
        for(let n=0; n < mockAttestations[i].attestation_list.length; n++) {
          let data = mockAttestations[i].attestation_list[n];
          let spy = jest.spyOn(signerService, 'sign');
          let message = Buffer.from(data.message, 'hex');
          let publicKey = Buffer.from(keyJson.pubkey, 'hex');
          let result = await signerController.Sign({ signing_root: message, public_key: publicKey});
          expect(result.signature).toEqual(Uint8Array.from(data.signature));
          expect(spy).toHaveBeenCalled();
        }
      }
    });
  })

});

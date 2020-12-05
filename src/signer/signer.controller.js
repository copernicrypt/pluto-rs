import { Controller, Dependencies, Get } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { SignerService } from './signer.service';

@Controller()
@Dependencies(SignerService)
export class RemoteSigner {
  constructor(signerService) {
    this.signerService = signerService;
  }

  @GrpcMethod('RemoteSigner')
  async ListValidatingPublicKeys(data, metadata) {
    try {
      let publicKeys = await this.signerService.getValidatingKeys(data);
      return { validating_public_keys: publicKeys }
    }
    catch(error) {
      console.error(error);
      return { validating_public_keys: [] }
    }
  }

  @GrpcMethod('RemoteSigner')
  async Sign(data, metadata) {
    try {
      let signature = await this.signerService.sign(data);
      return {
        signature: signature,
        status: 1
      }
    }
    catch(error) { console.error(error); return { status: 3 } }
  }
}

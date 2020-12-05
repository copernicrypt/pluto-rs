import { Module, HttpModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RemoteSigner } from './signer.controller';
import { SignerService } from './signer.service';

@Module({
  imports: [ConfigModule.forRoot(), HttpModule],
  controllers: [RemoteSigner],
  providers: [SignerService]
})
export class SignerModule {}

import _ from 'lodash';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import grpc from 'grpc';
import fs from 'fs';
import { join, resolve } from 'path';
import os from 'os';
import yaml from 'js-yaml';
import { SignerModule } from './signer/signer.module';

const argv = require('minimist')(process.argv.slice(2));

const CONFIG_PATH = (!_.isNil(argv.config)) ? argv.config.replace(/^~/, os.homedir()) : resolve(__dirname, "../config/default.yml");
const config = yaml.safeLoad(fs.readFileSync(CONFIG_PATH, 'utf8'));

async function bootstrap() {
  let credentials=null;
  if(argv.exec !== 'jest') {
    const TLS_DIR = config.certificate_dir.replace(/^~/, os.homedir());
    let TLS_CA = fs.promises.readFile(`${resolve(TLS_DIR, config.tls_ca)}`);
    let TLS_KEY = fs.promises.readFile(`${resolve(TLS_DIR, config.tls_key)}`);
    let TLS_CERT = fs.promises.readFile(`${resolve(TLS_DIR, config.tls_cert)}`);
    [TLS_CA, TLS_KEY, TLS_CERT] = await Promise.all([TLS_CA, TLS_KEY, TLS_CERT]);
    const checkClientCert = true;
    credentials = grpc.ServerCredentials.createSsl(TLS_CA, [
      { private_key: TLS_KEY, cert_chain: TLS_CERT }
    ], checkClientCert);
  }

  const app = await NestFactory.createMicroservice(SignerModule, {
    transport: Transport.GRPC,
    options: {
      url: config.host,
      package: 'ethereum.validator.accounts.v2',
      protoPath: join(__dirname, '../proto/signer.proto'),
      loader: { keepCase: true },
      credentials: credentials
    },
  });
  await app.listen();
}
bootstrap();

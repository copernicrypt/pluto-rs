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

let credentials=null;
if(argv.exec !== 'jest') {
  const TLS_DIR = config.certificate_dir.replace(/^~/, os.homedir());
  const TLS_CA = fs.readFileSync(`${resolve(TLS_DIR, config.tls_ca)}`);
  const TLS_KEY = fs.readFileSync(`${resolve(TLS_DIR, config.tls_key)}`);
  const TLS_CERT = fs.readFileSync(`${resolve(TLS_DIR, config.tls_cert)}`);
  const checkClientCert = true;
  credentials = grpc.ServerCredentials.createSsl(TLS_CA, [
    { private_key: TLS_KEY, cert_chain: TLS_CERT }
  ], checkClientCert)
}

async function bootstrap() {
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

# Pluto-RS
## Remote Signer for Prysm
![Release](https://img.shields.io/github/v/release/copernicrypt/pluto-rs?include_prereleases)
![License](https://img.shields.io/github/license/copernicrypt/pluto-rs) ![Unit Tests](https://github.com/copernicrypt/pluto-rs/workflows/Tests/badge.svg)

A Remote Signing Server for Ethereum 2 Prysm Client ([See Prysm Documentation](https://docs.prylabs.network/docs/wallet/remote))

** **USE AT YOUR OWN RISK. IMPROPER SETUP MAY RESULT IN SLASHING** **

## Highlights
-   Implements a [gRPC](https://grpc.io/) Microservice according to Prysm Specs
-   Built on [NestJS](https://nestjs.com/)
-   Compatible with the [Official Ethereum 2.0 CLI](https://github.com/ethereum/eth2.0-deposit-cli)

## Dependencies
1.  [NodeJS](https://nodejs.org/)
2.  [Prysm ETH2 Client](https://github.com/prysmaticlabs/prysm)

## Setup Guide (Ubuntu)

1.  [Pre-Requisites](#pre-requisites)
2.  [Networking](#networking)
3.  [TLS Certificates](#tls-certificates)
4.  [Install Pluto-RS](#install-pluto-rs)
5.  [Run Pluto-RS](#run-pluto-rs)
6.  [Configure Prysm Validator](#configure-prysm-validator)
7.  [Run Prysm Validator](#run-prysm-validator)

### Pre-Requisites
-   Active + Synced `Beacon Node` running on Prysm ([See Prysm Documentation](https://docs.prylabs.network/docs/getting-started/))
-   Server for running `Validator Node` on Prysm (can be same server as `Beacon`). If using a separate server, ensure the `Beacon` Server can receive requests from your `Validator` Server.
-   Set of Validator Keys in EIP-2335 Format. (ex: [Ethereum 2.0 Launchpad](https://launchpad.ethereum.org/))
-   Server for Running Pluto-RS

### Networking
The default Pluto port is `50055`. This can be changed in configuration, so modify below values if defaults are changed in config.
-   Ensure `Validator` server has **outbound** port `50055` open.
-   Ensure `Pluto-rs` server has **inbound** port `50055` open.

### TLS Certificates
-   [Root TLS Certificate](#root-tls-certificate)
-   [Server TLS Certificate](#server-tls-certificate)
-   [Client TLS Certificate](#client-tls-certificate)

#### Root TLS Certificate
First we need to generate a self-signed TLS certificate. On your `remote signing server`, find a place to store your TLS Certificate(s) and Key(s). For this example I will be using `~/.ssl`.
```shell
cd ~/.ssl
openssl genrsa -out ca.key 4096
openssl req -new -x509 -key ca.key -sha256 -subj "/C=US/ST=CA/O=StakeInc" -days 3650 -out ca.cert
```

This generates a 4096-bit key, which is then used to generate a new x509 certificate authority valid for 10 years (10 x 365). Adjust the validity period to suit your needs. You'll use this certificate to sign the `server` and `client` certs.


#### Server TLS Certificate
Still on the `remote signing server`.

1.  First generate an SSL configuration file. (see `config/certificate.conf` and replace areas with curly {} braces). Below is **only an example**. Modify it for your server and organizational needs. Pay particular attention to the `CN` and `alt_names` sections.

  ```shell
  nano certificate.conf
  ```

  ```shell
  [req]
  default_bits = 4096
  prompt = no
  default_md = sha256
  req_extensions = req_ext
  distinguished_name = dn
  [dn]
  C = US
  ST = CA
  O = StakeInc
  CN = localhost
  [req_ext]
  subjectAltName = @alt_names
  [alt_names]
  DNS.1 = localhost
  IP.1 = ::1
  IP.2 = 127.0.0.1
  IP.3 = 172.0.9.3
  ```

2.  Next, generate a `server` key and signing request (CSR).
  ```shell
  openssl genrsa -out server.key 4096
  openssl req -new -key server.key -out server.csr -config certificate.conf
  ```

3.  Finally, sign the CSR to generate the `server` certificate. Valid for 1 year.
  ```shell
  openssl x509 -req -in server.csr -CA ca.cert -CAkey ca.key -CAcreateserial -out server.pem -days 365 -sha256 -extfile certificate.conf -extensions req_ext
  ```


#### Client TLS Certificate
Switching to your `validator server`.

1.  Generate SSL Configuration File (Same as `Server` process, modify IP and CN details to suit your needs).

2.  Generate a `client` key and signing request (CSR).
  ```shell
  cd ~/.ssl
  openssl genrsa -out client.key 4096
  openssl req -new -key client.key -out client.csr -config certificate.conf
  ```

3.  Copy the contents of `client.csr` and make a copy on the `remote signing server`.
4.  On the `remote signing server`, sign the CSR to generate the `client` certificate. Valid for 1 year.
  ```shell
  openssl x509 -req -in client.csr -CA ca.cert -CAkey ca.key -out client.pem -days 365 -sha256
  ```
5.  Copy the contents of `client.pem` and `ca.cert` to make a copy on the `validator server`.

### Install Pluto-RS
** **Requires NodeJS** **

```shell
git clone https://github.com/copernicrypt/pluto-rs
cd pluto-rs
npm install
```

### Run Pluto-RS
1.  Import your Validator Keys to the `remote signing server`.
```shell
mkdir validators
unzip validators.zip
```
2.  Create Password File
```shell
nano password.txt
```
3.  Create Pluto Config File (see `config/default.yml` for example)
4.  Start Pluto-RS
```shell
cd pluto-rs
npm run start --config=<PATH_TO_CONFIG>
```

### Configure Prysm Validator
See [Prysm Documentation](https://docs.prylabs.network/docs/wallet/remote).

On your `validator server`, create a new remote wallet and reference your TLS credentials and  `remote signing server`. **NOTE** If you already have a wallet setup on this server, you will either need to delete it, or specify a new `--wallet-dir` for the new remote wallet.

```shell
cd prysm
./prysm.sh validator wallet create --keymanager-kind=remote --grpc-remote-address=<YOUR_REMOTE_SIGNING_SERVER_ADDRESS> --remote-signer-crt-path=<PATH_TO_CLIENT_CERTIFICATE> --remote-signer-key-path=<PATH_TO_CLIENT_KEY> --remote-signer-ca-crt-path=<PATH_TO_CERTIFCATE_AUTHORITY>
```

Test that your configuration is working and can see your validators:
```shell
./prysm.sh validator accounts list
```

### Run Prysm Validator
If you created a new `wallet-dir` for the remote server, make sure you specify it in the config.
```shell
./prysm validator --config-file=<PATH_TO_CONFIG>
```

## Future Development
-   Add Teku Compatibility

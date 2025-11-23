# local_client

To install dependencies:


## On Linux
This app uses [keytar](https://www.npmjs.com/package/keytar) which uses libsecret.  so you may need to install it before running bun install.

```bash
deno install --allow-scripts=npm:keytar --entrypoint ./src/index.ts
```

To run:

```bash
# TODO restrict permissions to only what is needed
deno run -A src/index.ts
```



You will see a prompt come up to allow access to the keychain where the private key is stored.

## Testing
```bash
# TODO restrict permissions to only what is needed
deno test -A
```

Uses Json-Web-Signatures https://www.rfc-editor.org/rfc/rfc7515 https://en.wikipedia.org/wiki/JSON_Web_Signature

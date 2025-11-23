Opener of The Ways: Protecting Against Malicious Website Crawlers Via DID Key-Based Authentication

Or ootws for short (the w is silent).

# Requirements
Deno version 2.5.5 and higher.
Insall instruction for deno can be found here https://docs.deno.com/runtime/getting_started/installation/
## Usage
Start the client with
```bash
cd local_client deno run -A src/index.ts
```

This will print out a DID that the client is using to authenticate itself, copy that DID and then run

```bash
cd ../node_server deno run -A --unstable-kv src/manually_add_root_user.ts <PASTE_DID_HERE>
```
This will manually trust the client DID as a root user.

Now you can start the server with
```bash
deno run -A --unstable-kv src/index.ts
```
which will open the page up in your browser automatically.

## Testing
Each component has its own tests, cd into the component directory and run:
```
deno test --A
```
to run the tests.
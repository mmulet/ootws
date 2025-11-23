The node server keeps track of the did tree


```bash
deno install --allow-scripts=npm:keytar --entrypoint ./src/index.ts
```

```bash
deno run -A --unstable-kv src/index.ts
```

# Testing
```bash
deno test -A --unstable-kv
```
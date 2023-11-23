# filebase-upload

Minimal library to upload files on [Filebase](https://filebase.com) S3 API. Partially based on
[AWS SDK v3](https://github.com/aws/aws-sdk-js-v3).

## Install

```sh
pnpm i @stauro/filebase-upload
```

## Usage

First, you need to set up a token. A token is a base64 encoded pair of the access key and access secret.

You can generate a token like this:

```sh
echo "accessKey:accessSecret" | base64
```

and save it to a `.env` file or somewhere else.

### Node.js

```ts
import { createPresignedUrl } from '@stauro/filebase-upload'

const file = new File(['Hello world'], 'hello.txt')

const url = await createPresignedUrl({
  bucketName: 'testing-example-1',
  token: process.env.FILEBASE_TOKEN,
  file,
  apiUrl: 's3.filebase.com',
})

await fetch(decodeURIComponent(url), { method: 'PUT', body: file })
```

And then run as:

```sh
node --env-file=.env main.js
```

### Deno

```ts
import { createPresignedUrl } from 'https://deno.land/x/filebase_upload/mod.ts'
import { load } from 'https://deno.land/std@0.207.0/dotenv/mod.ts'

const env = await load()

const file = new File(['Hello world'], 'hello.txt')

const url = await createPresignedUrl({
  bucketName: 'testing-example-1',
  token: env.FILEBASE_TOKEN,
  file,
  apiUrl: 's3.filebase.com',
})

await fetch(decodeURIComponent(url), { method: 'PUT', body: file })
```

And then run as:

```sh
deno --allow-read --allow-net mod.ts
```

import { createPresignedUrl } from './mod.ts'
import { load } from 'https://deno.land/std@0.207.0/dotenv/mod.ts'

const env = await load()

const file = new File(['Hello world'], 'hello.txt')

const url = await createPresignedUrl({
  bucketName: `example-${crypto.randomUUID()}`,
  token: env.FILEBASE_TOKEN,
  file,
  apiUrl: 's3.filebase.com',
})

const res = await fetch(decodeURIComponent(url), {
  method: 'PUT',
  body: file,
})

console.log(await res.text())

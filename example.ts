import { createPresignedUrl, getObject } from './mod.ts'
import { load } from 'https://deno.land/std@0.207.0/dotenv/mod.ts'

const env = await load()

const file = new File(['Hello world'], 'hello.txt')

const init = {
  bucketName: `example-${crypto.randomUUID()}`,
  token: env.FILEBASE_TOKEN,
  apiUrl: 's3.filebase.com',
}

const url = await createPresignedUrl({ ...init, file })

await fetch(decodeURIComponent(url), {
  method: 'PUT',
  body: file,
})

const res = await getObject({ ...init, filename: 'hello.txt' })

console.log(`${res.headers.get('x-amz-meta-cid')}:`, await res.text())

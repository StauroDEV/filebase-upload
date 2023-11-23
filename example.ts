import { createPresignedUrlWithoutClient } from './mod.ts'
import { load } from 'https://deno.land/std@0.207.0/dotenv/mod.ts'

const env = await load()

const file = new File(['Hello world'], 'hello.txt')

const url = await createPresignedUrlWithoutClient({
  bucketName: 'testing-example-1',
  token: env.FILEBASE_TOKEN,
  file,
  apiUrl: 's3.filebase.com',
})

await fetch(decodeURIComponent(url), {
  method: 'PUT',
  body: file,
})

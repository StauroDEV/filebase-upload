import { describe, it } from 'https://deno.land/std@0.207.0/testing/bdd.ts'
import { assertEquals } from 'https://deno.land/std@0.207.0/assert/mod.ts'
import { getObject } from './mod.ts'

describe('getObject', () => {
  it('should return a response of a file', async () => {
    const res = await getObject({
      bucketName: 'filebase-upload-tests',
      token: Deno.env.get('FILEBASE_TOKEN')!,
      filename: 'hello.txt',
      apiUrl: 's3.filebase.com',
    })
    assertEquals(await res.text(), 'Hello world')
    assertEquals(res.headers.get('x-amz-meta-cid'), 'QmNRCQWfgze6AbBCaT1rkrkV5tJ2aP4oTNPb5JZcXYywve')
  })
})

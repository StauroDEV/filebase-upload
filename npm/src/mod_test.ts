import * as dntShim from "./_dnt.test_shims.js";
import { describe, it } from './deps/deno.land/std@0.207.0/testing/bdd.js'
import { assertEquals } from './deps/deno.land/std@0.207.0/assert/mod.js'
import { getObject } from './mod.js'

describe('getObject', () => {
  it('should return a response of a file', async () => {
    const res = await getObject({
      bucketName: 'filebase-upload-tests',
      token: dntShim.Deno.env.get('FILEBASE_TOKEN')!,
      filename: 'hello.txt',
      apiUrl: 's3.filebase.com',
    })
    assertEquals(await res.text(), 'Hello world')
    assertEquals(res.headers.get('x-amz-meta-cid'), 'QmNRCQWfgze6AbBCaT1rkrkV5tJ2aP4oTNPb5JZcXYywve')
  })
})

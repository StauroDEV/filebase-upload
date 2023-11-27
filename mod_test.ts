import { assertEquals, assertStringIncludes, describe, it } from './dev_deps.ts'
import { getObject } from './mod.ts'

describe('getObject', () => {
  it('should return a response of a file', async () => {
    const res = await getObject({
      bucketName: 'filebase-upload-tests',
      token: Deno.env.get('FILEBASE_TOKEN')!,
      filename: 'hello.txt',
    })
    assertEquals(await res.text(), 'Hello world')
    assertEquals(
      res.headers.get('x-amz-meta-cid'),
      'QmNRCQWfgze6AbBCaT1rkrkV5tJ2aP4oTNPb5JZcXYywve',
    )
  })
  it('should accept custom `apiUrl`', async () => {
    try {
      await getObject({
        bucketName: 'filebase-upload-tests',
        token: Deno.env.get('FILEBASE_TOKEN')!,
        filename: 'hello.txt',
        apiUrl: 'stauro.dev',
      })
    } catch (error) {
      if (error.cause) {
        assertStringIncludes(error.cause.hostname, 'filebase-upload-tests.stauro.dev')
      } else assertStringIncludes(error.message, 'filebase-upload-tests.stauro.dev')
    }
  })
})

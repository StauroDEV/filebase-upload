import { CAREncoderStream, createFileEncoderStream } from 'ipfs-car'
import { CID } from 'multiformats'
import { describe, it } from '@std/testing/bdd'
import { getObject, uploadCar, headObject } from './mod.ts'
import { assertEquals } from '@std/assert/equals'
import { assertStringIncludes } from '@std/assert/string-includes'

const placeholderCID = CID.parse('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')

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
      if ((error as Error).cause) {
        assertStringIncludes(((error as Error).cause as URL).hostname, 'filebase-upload-tests.stauro.dev')
      } else assertStringIncludes((error as Error).message, 'filebase-upload-tests.stauro.dev')
    }
  })
})

describe('headObject', () => {
  it('should return whether the file is uploaded and give its CID', async () => {
    const [isUploaded, cid] = await headObject({
      bucketName: 'filebase-upload-tests',
      token: Deno.env.get('FILEBASE_TOKEN')!,
      filename: 'hello.txt',
    })
    assertEquals(isUploaded, true)
    assertEquals(cid, 'QmNRCQWfgze6AbBCaT1rkrkV5tJ2aP4oTNPb5JZcXYywve')
  })
})

describe('uploadCar', { sanitizeResources: false }, () => {
  it(
    'should upload a CAR file and emit a CID from response headers',
    async () => {
      const stream = createFileEncoderStream(new Blob(['Hello ipfs-car!']))
        .pipeThrough(new CAREncoderStream([placeholderCID]))

      const file = new File([await new Response(stream).blob()], 'file.car')

      const res = await uploadCar({ bucketName: 'filebase-upload-tests', token: Deno.env.get('FILEBASE_TOKEN')!, file })
      assertEquals(res.headers.get('x-amz-meta-cid'), 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')
    },
  )
})

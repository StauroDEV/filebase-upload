import { CAREncoderStream, createFileEncoderStream } from 'npm:ipfs-car'
import { CID } from 'npm:multiformats'
import { describe, it } from '@std/testing/bdd'
import { getObject, uploadCar } from './mod.ts'
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

async function streamToBlob(stream: ReadableStream): Promise<Blob> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  const blob = new Blob(chunks, { type: 'application/octet-stream' })
  return blob
}

describe('uploadCar', () => {
  it(
    'should upload a CAR file and emit a CID from response headers',
    async () => {
      const stream = createFileEncoderStream(new Blob(['Hello ipfs-car!']))
        .pipeThrough(
          new TransformStream(),
        )
        .pipeThrough(new CAREncoderStream([placeholderCID]))

      const blob = await streamToBlob(stream)

      const file = new File([blob], 'file.car')

      const res = await uploadCar({ bucketName: 'filebase-upload-tests', token: Deno.env.get('FILEBASE_TOKEN')!, file })
      await res.body?.cancel()

      assertEquals(res.headers.get('x-amz-meta-cid'), 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')
    },
  )
})

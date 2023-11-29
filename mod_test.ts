import { CAREncoderStream, createFileEncoderStream } from 'https://esm.sh/ipfs-car@1.0.0?pin=v133'
import { CID } from 'https://esm.sh/multiformats@12.1.3/cid?pin=v133'
import { assertEquals, assertStringIncludes, describe, it } from './dev_deps.ts'
import { getObject, uploadCar } from './mod.ts'

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
      if (error.cause) {
        assertStringIncludes(error.cause.hostname, 'filebase-upload-tests.stauro.dev')
      } else assertStringIncludes(error.message, 'filebase-upload-tests.stauro.dev')
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
      const fetchResource = Object.keys(Deno.resources()).find((key) =>
        Deno.resources()[parseInt(key)] === 'fetchResponse'
      )

      assertEquals(res.headers.get('x-amz-meta-cid'), 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')
      Deno.close(parseInt(fetchResource!)) // weird response
    },
  )
})

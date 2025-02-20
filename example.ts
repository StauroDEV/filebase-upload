import { uploadCar } from './mod.ts'
import { load } from '@std/dotenv'
import { CAREncoderStream, createFileEncoderStream } from 'ipfs-car'
import { CID } from 'multiformats'

const env = await load()

const init = {
  bucketName: `filebase-upload-tests`,
  token: env.FILEBASE_TOKEN,
}

const placeholderCID = CID.parse('bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')

const stream = createFileEncoderStream(new Blob(['Hello ipfs-car!']))
  .pipeThrough(
    new TransformStream(),
  )
  .pipeThrough(new CAREncoderStream([placeholderCID]))

const blob = await new Response(stream).blob()

const file = new File([blob], 'file.car')

const cid = await uploadCar({ ...init, file })

console.log(cid)

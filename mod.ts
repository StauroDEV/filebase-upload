import { FILEBASE_API_URL } from './constants.ts'
import {
  aws4,
  ChecksumConstructor,
  createHash,
  createHmac,
  HeaderBag,
  Hmac,
  IHttpRequest,
  NodeHash,
  QueryParameterBag,
  S3RequestPresigner,
} from './deps.ts'
import { RequiredArgs } from './types.ts'

import {
  castSourceData,
  createBucket,
  formatUrl,
  fromEnv,
  generateFilebaseRequestOptions,
  parseUrl,
  toUint8Array,
} from './utils.ts'

export class HashImpl {
  #algorithmIdentifier: string
  #secret?
  #hash!: NodeHash | Hmac

  constructor(algorithmIdentifier: string, secret?: string) {
    this.#algorithmIdentifier = algorithmIdentifier
    this.#secret = secret
    this.reset()
  }

  update(toHash: string, encoding?: 'utf8' | 'ascii' | 'latin1'): void {
    this.#hash.update(toUint8Array(castSourceData(toHash, encoding)))
  }

  digest(): Promise<Uint8Array> {
    return Promise.resolve(this.#hash.digest())
  }

  reset(): void {
    this.#hash = this.#secret
      ? createHmac(this.#algorithmIdentifier, castSourceData(this.#secret))
      : createHash(this.#algorithmIdentifier)
  }
}

class HttpRequest {
  method: string
  protocol: string
  hostname: string
  port?: number
  path: string
  query?: QueryParameterBag | undefined
  headers: HeaderBag
  username?: string
  password?: string
  fragment?: string
  body?: unknown

  constructor(options: IHttpRequest) {
    this.method = options.method || 'GET'
    this.hostname = options.hostname || 'localhost'
    this.port = options.port
    this.query = options.query || {}
    this.headers = options.headers || {}
    this.body = options.body
    this.protocol = options.protocol
      ? options.protocol.slice(-1) !== ':' ? `${options.protocol}:` : options.protocol
      : 'https:'
    this.path = options.path ? options.path.charAt(0) !== '/' ? `/${options.path}` : options.path : '/'
    this.username = options.username
    this.password = options.password
    this.fragment = options.fragment
  }
}

export const createPresignedUrl = async ({
  bucketName,
  apiUrl,
  file,
  token,
}: {
  file: File
} & RequiredArgs) => {
  await createBucket({ bucketName, apiUrl, token })
  const url = parseUrl(
    `https://${apiUrl ?? FILEBASE_API_URL}/${bucketName}/${file.name}`,
  )
  const presigner = new S3RequestPresigner({
    credentials: fromEnv(token),
    region: 'us-east-1',
    sha256: HashImpl.bind(null, 'sha256') as unknown as ChecksumConstructor,
  })

  const signedUrlObject = await presigner.presign(
    new HttpRequest({ ...url, method: 'PUT', headers: {} }),
    { expiresIn: 3600 },
  )
  return formatUrl(signedUrlObject)
}

export const uploadCar = async ({
  file,
  ...args
}: RequiredArgs & { file: File }) => {
  const url = await createPresignedUrl({ ...args, file })

  return fetch(decodeURIComponent(url), {
    method: 'PUT',
    body: file,
    headers: { 'x-amz-meta-import': 'car' },
  })
}

export const headObject = async ({
  bucketName,
  filename,
  apiUrl,
  token,
}: RequiredArgs & {
  filename: string
}): Promise<[boolean, string | null, string | null]> => {
  let requestOptions: aws4.Request & { key?: string } = {
    host: `${bucketName}.${apiUrl ?? FILEBASE_API_URL}`,
    path: `/${filename}`,
    key: `/${filename}`,
    region: 'us-east-1',
    method: 'HEAD',
    service: 's3',
    headers: {},
  }
  requestOptions = generateFilebaseRequestOptions(token, requestOptions)
  return  fetch(
    `https://${requestOptions.host}${requestOptions.path}`,
    requestOptions as RequestInit,
  ).then((res) => [
    res.status == 200,
    res.headers.get('x-amz-meta-cid'),
    res.headers.get('content-length'),
  ])
}

export const getObject = async ({
  bucketName,
  filename,
  apiUrl,
  token,
}: RequiredArgs & {
  filename: string
}) => {
  let requestOptions: aws4.Request & { key?: string } = {
    host: `${bucketName}.${apiUrl ?? FILEBASE_API_URL}`,
    path: `/${filename}`,
    key: `/${filename}`,
    region: 'us-east-1',
    method: 'GET',
    service: 's3',
    headers: {},
  }
  requestOptions = generateFilebaseRequestOptions(token, requestOptions)
  return  fetch(
    `https://${requestOptions.host}${requestOptions.path}`,
    requestOptions as RequestInit,
  )
}

export const uploadFile = async ({
  file,
  ...args
}: RequiredArgs & { file: File }) => {
  const url = await createPresignedUrl({ ...args, file })
  return fetch(decodeURIComponent(url), {
    method: 'PUT',
    body: file,
  })
}

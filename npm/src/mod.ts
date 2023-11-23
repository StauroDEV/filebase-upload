import {
  aws4,
  AwsCredentialIdentity,
  Buffer,
  ChecksumConstructor,
  createHash,
  createHmac,
  HeaderBag,
  Hmac,
  IHttpRequest,
  NodeHash,
  QueryParameterBag,
  S3RequestPresigner,
} from './deps.js'

const parseUrl = (
  url: string | URL,
): Pick<IHttpRequest, 'hostname' | 'port' | 'protocol' | 'path' | 'query'> => {
  if (typeof url === 'string') {
    return parseUrl(new URL(url))
  }
  const { hostname, pathname, port, protocol } = url as URL

  return {
    hostname,
    port: port ? parseInt(port) : undefined,
    protocol,
    path: pathname,
    query: undefined,
  }
}

const generateFilebaseRequestOptions = (
  token: string,
  requestOptions: aws4.Request & { key?: string },
) => {
  const [accessKeyId, secretAccessKey] = atob(token).split(':')
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Missing access key ID and secret access key')
  }
  aws4.sign(requestOptions, { accessKeyId, secretAccessKey })
  return requestOptions
}

const te = new TextEncoder()

const toUint8Array = (
  data: string | ArrayBuffer | ArrayBufferView,
): Uint8Array => {
  if (typeof data === 'string') {
    return te.encode(data)
  }

  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(
      data.buffer,
      data.byteOffset,
      data.byteLength / Uint8Array.BYTES_PER_ELEMENT,
    )
  }

  return new Uint8Array(data)
}

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
const hexEncode = (c: string) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`

const escapeUri = (uri: string): string =>
  // AWS percent-encodes some extra non-standard characters in a URI
  encodeURIComponent(uri).replace(/[!'()*]/g, hexEncode)

const buildQueryString = (query: QueryParameterBag): string => {
  const parts: string[] = []
  for (let key of Object.keys(query).sort()) {
    const value = query[key]
    key = escapeUri(key)
    if (Array.isArray(value)) {
      for (let i = 0, iLen = value.length; i < iLen; i++) {
        parts.push(`${key}=${escapeUri(value[i])}`)
      }
    } else {
      let qsEntry = key
      if (value || typeof value === 'string') {
        qsEntry += `=${escapeUri(value)}`
      }
      parts.push(qsEntry)
    }
  }

  return parts.join('&')
}

const castSourceData = (
  toCast: string | Buffer | ArrayBuffer,
  encoding?: BufferEncoding,
): Buffer => {
  if (Buffer.isBuffer(toCast)) {
    return toCast
  }

  if (typeof toCast === 'string') {
    return Buffer.from(toCast, encoding)
  }

  if (ArrayBuffer.isView(toCast)) {
    return Buffer.from(toCast.buffer, toCast.byteOffset, toCast.byteLength)
  }

  return Buffer.from(toCast)
}

const formatUrl = (
  request: Omit<HttpRequest, 'headers' | 'method'>,
): string => {
  const { port, query } = request
  let { protocol, path, hostname } = request
  if (protocol && protocol.slice(-1) !== ':') {
    protocol += ':'
  }
  if (port) {
    hostname += `:${port}`
  }
  if (path && path.charAt(0) !== '/') {
    path = `/${path}`
  }
  let queryString = query ? buildQueryString(query) : ''
  if (queryString && queryString[0] !== '?') {
    queryString = `?${queryString}`
  }
  let auth = ''
  if (request.username != null || request.password != null) {
    const username = request.username ?? ''
    const password = request.password ?? ''
    auth = `${username}:${password}@`
  }
  let fragment = ''
  if (request.fragment) {
    fragment = `#${request.fragment}`
  }
  return `${protocol}//${auth}${hostname}${path}${queryString}${fragment}`
}

const fromEnv = (filebaseToken: string): () => Promise<AwsCredentialIdentity> => {
  return async () => {
    const [accessKeyId, secretAccessKey] = atob(filebaseToken).split(':')
    if (!accessKeyId || !secretAccessKey) {
      throw new Error('Missing access key ID and secret access key')
    }
    return {
      accessKeyId,
      secretAccessKey,
    }
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
    this.path = options.path ? (options.path.charAt(0) !== '/' ? `/${options.path}` : options.path) : '/'
    this.username = options.username
    this.password = options.password
    this.fragment = options.fragment
  }
}

const createBucket = async (
  { bucketName, apiUrl, token }: { bucketName: string; apiUrl: string; token: string },
) => {
  let requestOptions: aws4.Request = {
    host: `${bucketName}.${apiUrl}`,
    region: 'us-east-1',
    method: 'PUT',
    service: 's3',
    headers: {
      'Content-Length': 0,
    },
  }
  requestOptions = generateFilebaseRequestOptions(token, requestOptions)
  return await fetch(`https://${requestOptions.host}/`, requestOptions as RequestInit)
    .then((res) => res.status == 200)
}

export const createPresignedUrlWithoutClient = async (
  { bucketName, apiUrl, file, token }: { bucketName: string; apiUrl: string; file: File; token: string },
) => {
  await createBucket({ bucketName, apiUrl, token })
  const url = parseUrl(`https://${apiUrl}/${bucketName}/${file.name}`)
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

export const headObject = async (
  { bucketName, filename, apiUrl, token }: {
    bucketName: string
    filename: string
    apiUrl: string
    token: string
  },
) => {
  let requestOptions: aws4.Request & { key?: string } = {
    host: `${bucketName}.${apiUrl}`,
    path: `/${filename}`,
    key: `/${filename}`,
    region: 'us-east-1',
    method: 'HEAD',
    service: 's3',
    headers: {},
  }
  requestOptions = generateFilebaseRequestOptions(
    token,
    requestOptions,
  )
  return await fetch(
    `https://${requestOptions.host}${requestOptions.path}`,
    requestOptions as RequestInit,
  )
    .then((res) => res.status == 200)
}

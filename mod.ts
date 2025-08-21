import { FILEBASE_API_URL } from './constants.ts'
import type { HeaderBag, HttpRequest as IHttpRequest, QueryParameterBag } from '@smithy/types'

import type aws4 from 'aws4'
import type { RequiredArgs } from './types.ts'

import {
  createBucket,
  formatUrl,
  fromEnv,
  generateFilebaseRequestOptions,
  parseUrl,
  presignRequest
} from './utils.ts'

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

export const createPresignedUrl = async (
  { bucketName, apiUrl, file, token }: {
    file: File
  } & RequiredArgs,
): Promise<string> => {
  await createBucket({ bucketName, apiUrl, token })
  const url = parseUrl(`https://${apiUrl ?? FILEBASE_API_URL}/${bucketName}/${file.name}`)
  const { accessKeyId, secretAccessKey } = fromEnv(token)()

  const signedRequest = presignRequest(
    new HttpRequest({ ...url, method: 'PUT', headers: {} }),
    {
      accessKeyId,
      secretAccessKey,
      region: 'us-east-1',
      expiresIn: 3600,
    },
  )
  return formatUrl(signedRequest)
}

export const uploadCar = async ({ file, ...args }: RequiredArgs & { file: File }): Promise<Response> => {
  const url = await createPresignedUrl({ ...args, file })

  const res = await fetch(decodeURIComponent(url), {
    method: 'PUT',
    body: file,
    headers: { 'x-amz-meta-import': 'car' },
  })

  return res
}

export const headObject = async (
  { bucketName, filename, apiUrl, token }: RequiredArgs & {
    filename: string
  },
): Promise<[boolean, string | null]> => {
  let requestOptions: aws4.Request & { key?: string } = {
    host: `${bucketName}.${apiUrl ?? FILEBASE_API_URL}`,
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
    .then((res) => [res.status == 200, res.headers.get('x-amz-meta-cid')])
}

export const getObject = async (
  { bucketName, filename, apiUrl, token }: RequiredArgs & {
    filename: string
  },
): Promise<Response> => {
  let requestOptions: aws4.Request & { key?: string } = {
    host: `${bucketName}.${apiUrl ?? FILEBASE_API_URL}`,
    path: `/${filename}`,
    key: `/${filename}`,
    region: 'us-east-1',
    method: 'GET',
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
}

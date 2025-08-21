import { describe, it } from '@std/testing/bdd'
import { assertEquals, assertThrows } from '@std/assert'
import { parseUrl, presignRequest, toUint8Array } from './utils.ts'
import type { HttpRequest } from '@smithy/types'
import { assertObjectMatch } from '@std/assert/object-match'

describe('parseUrl', () => {
  describe('should return the correct parsed URL', () => {
    it('with protocol', () => {
      const url = 'https://example.com/path'
      const parsedUrl = parseUrl(url)
      assertEquals(parsedUrl.protocol, 'https:')
      assertEquals(parsedUrl.hostname, 'example.com')
    })
    it('with port', () => {
      const url = 'http://example.com:8080/path'
      const parsedUrl = parseUrl(url)
      assertEquals(parsedUrl.port, 8080)
    })
  })

  it('should throw error for invalid URL', () => {
    const url = 'not a valid url'
    assertThrows(() => {
      parseUrl(url)
    })
  })
})

const te = new TextEncoder()

describe('toUint8Array', () => {
  it('should convert a UTF-8 string to Uint8Array', () => {
    const input = 'Hello, World!'
    const uint8Array = toUint8Array(input)
    assertEquals(uint8Array, te.encode(input))
  })
  it('should convert an ArrayBuffer to Uint8Array', () => {
    const buffer = new ArrayBuffer(8)
    const uint8Array = toUint8Array(buffer)
    assertEquals(uint8Array, new Uint8Array(buffer))
  })
})

describe('presignRequest', () => {
  it('should return a signed request', () => {
    const request: HttpRequest = {
      method: 'GET',
      hostname: 'example.com',
      path: '/path',
      query: {},
      headers: {},
      username: '',
      password: '',
      fragment: '',
      protocol: 'https:',
    }
    const signedRequest = presignRequest(request, {
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      region: 'us-east-1',
      expiresIn: 3600,
    })

    const now = new Date()
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
    const amzShortDate = amzDate.slice(0, 8)

    assertEquals(signedRequest.method, 'GET')
    assertEquals(signedRequest.hostname, 'example.com')
    assertEquals(signedRequest.path, '/path')
    assertObjectMatch(signedRequest.query!, {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `AKIAIOSFODNN7EXAMPLE/${amzShortDate}/us-east-1/s3/aws4_request`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': '3600',
      'X-Amz-SignedHeaders': 'host',
    })
    assertEquals(signedRequest.headers, {})
  })
})

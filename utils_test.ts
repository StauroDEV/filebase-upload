import { describe, it } from 'https://deno.land/std@0.207.0/testing/bdd.ts'
import { assertEquals, assertThrows } from 'https://deno.land/std@0.207.0/assert/mod.ts'
import { parseUrl, toUint8Array } from './utils.ts'

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

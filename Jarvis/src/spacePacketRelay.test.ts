import { describe, expect, it } from 'vitest'
import { __testDedupeKey, __testEncryptRoundtrip } from './spacePacketRelay'

describe('spacePacketRelay crypto', () => {
  it('encrypts and decrypts chat packets', async () => {
    const packet = { type: 'chat', message: { id: 'm1', authorId: 'a', authorName: '나', text: '안녕', createdAt: 1 } }
    const out = await __testEncryptRoundtrip('ABC123', packet)
    expect(out).toEqual(packet)
  })

  it('dedupes by chat message id', () => {
    expect(
      __testDedupeKey({ type: 'chat', message: { id: 'x9', authorId: 'a', authorName: 'n', text: 't', createdAt: 1 } }),
    ).toBe('chat:x9')
  })
})

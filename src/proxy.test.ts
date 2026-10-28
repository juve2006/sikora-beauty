import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

import proxy from './proxy'

function get(path: string, headers: Record<string, string> = {}) {
  return proxy(new NextRequest(`http://localhost${path}`, { headers }))
}

describe('proxy', () => {
  it('serves / in Ukrainian to an English browser that visited /en before', async () => {
    const response = await get('/', {
      'accept-language': 'en-US,en;q=0.9',
      cookie: 'NEXT_LOCALE=en',
    })

    expect(response.headers.get('location')).toBeNull()
  })

  it('serves /en in English', async () => {
    const response = await get('/en')

    expect(response.headers.get('location')).toBeNull()
  })
})

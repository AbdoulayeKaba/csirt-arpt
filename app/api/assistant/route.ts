import { NextResponse } from 'next/server'
import {
  answerById,
  answerFromConfig,
  type AssistantScope,
} from '@/lib/csirt/assistant'
import {
  getAssistantConfig,
  getPublicAssistantPayload,
} from '@/lib/csirt/assistant-store'

function parseScope(value: string | null): AssistantScope {
  return value === 'signalement' ? 'signalement' : 'site'
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const scope = parseScope(searchParams.get('scope'))
  const id = searchParams.get('id')?.trim()
  const q = searchParams.get('q')?.trim()

  const config = await getAssistantConfig()

  if (id) {
    const answer = answerById(config, scope, id)
    return NextResponse.json({
      scope,
      answer: answer ?? config.fallback,
      matchedBy: answer ? 'id' : 'fallback',
    })
  }

  if (q) {
    return NextResponse.json({
      scope,
      answer: answerFromConfig(config, scope, q),
      matchedBy: 'query',
    })
  }

  const payload = await getPublicAssistantPayload(scope)
  return NextResponse.json(payload)
}

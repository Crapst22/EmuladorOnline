import { NextRequest, NextResponse } from 'next/server'
import { BITTO_SYSTEM_PROMPT } from '@/lib/bitto-prompt'
import {
  shouldSearchEliteguias,
  searchGuide,
  fetchGuideContent,
} from '@/lib/eliteguias'

const GROQ_API_BASE = 'https://api.groq.com/openai/v1'

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY no configurada. Agrégala en .env.local' },
        { status: 500 },
      )
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Mensajes inválidos' }, { status: 400 })
    }

    const lastMessage = messages[messages.length - 1]
    let eliteguiasContext = ''

    if (
      lastMessage?.role === 'user' &&
      shouldSearchEliteguias(lastMessage.content)
    ) {
      const guide = await searchGuide(lastMessage.content)

      if (guide) {
        const content = await fetchGuideContent(guide.url)

        if (content && content.length > 100) {
          eliteguiasContext = `\n\n## Información obtenida de Eliteguias.com (${guide.title}):\n${content}\n\nUsa esta información para responder la pregunta del usuario sobre la guía del juego. Menciona que la info viene de Eliteguias.com si es relevante.`
        }
      }
    }

    const systemContent = eliteguiasContext
      ? `${BITTO_SYSTEM_PROMPT}\n\nIMPORTANTE: El usuario está pidiendo ayuda con una guía de juego. Aquí tienes información extraída de Eliteguias.com para responder con datos reales:${eliteguiasContext}`
      : BITTO_SYSTEM_PROMPT

    const groqMessages = [
      { role: 'system', content: systemContent },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
    ]

    const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        temperature: 0.5,
        max_tokens: 400,
        top_p: 0.9,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Groq API error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Error al comunicarse con los cartuchos cósmicos' },
        { status: 502 },
      )
    }

    const data = await response.json()

    const text = data.choices?.[0]?.message?.content

    if (!text) {
      return NextResponse.json(
        { error: 'Respuesta vacía de la IA' },
        { status: 502 },
      )
    }

    return NextResponse.json({ message: { content: text } })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Error interno de RetroVerse' },
      { status: 500 },
    )
  }
}

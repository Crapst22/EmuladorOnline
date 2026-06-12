import { NextRequest, NextResponse } from 'next/server'
import { BITTO_SYSTEM_PROMPT } from '@/lib/bitto-prompt'
import {
  searchGuideByKey,
  fetchGuideContent,
  findGameInMessages,
  extractGameName,
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

    const currentGame =
      lastMessage?.role === 'user'
        ? extractGameName(lastMessage.content)
        : null
    const historyGame = currentGame ? null : findGameInMessages(messages)
    const gameKey = currentGame || historyGame

    if (gameKey) {
      const userMsg = lastMessage?.role === 'user' ? lastMessage.content : gameKey
      const guide = await searchGuideByKey(gameKey, userMsg)

      if (guide) {
        const content = await fetchGuideContent(guide.url)

        if (content && content.length > 100) {
          eliteguiasContext = `\n\n## Información obtenida de Eliteguias.com (${guide.title}):\n${content}\n\nRESPONDE EXCLUSIVAMENTE con esta información. NO inventes nada que no esté aquí.`
        }
      }
    }

    const systemContent = eliteguiasContext
      ? `${BITTO_SYSTEM_PROMPT}\n\n## INSTRUCCIÓN OBLIGATORIA\nEl usuario está pidiendo ayuda con una guía de juego. A continuación se te proporciona el contenido REAL extraído de Eliteguias.com. DEBES responder ÚNICAMENTE con la información contenida en ese texto. Si la respuesta no está en el texto, admite que no lo sabes. NO inventes absolutamente nada. NO uses tu conocimiento interno para complementar. La regla de "RESPUESTAS CORTAS" (máximo 2-4 oraciones) NO APLICA cuando tienes contenido de guía — puedes extenderte lo necesario para dar toda la información relevante.${eliteguiasContext}`
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
        temperature: eliteguiasContext ? 0.1 : 0.5,
        max_tokens: eliteguiasContext ? 1000 : 400,
        top_p: eliteguiasContext ? 0.3 : 0.9,
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

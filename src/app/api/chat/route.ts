import { NextRequest, NextResponse } from 'next/server'
import { BITTO_SYSTEM_PROMPT } from '@/lib/bitto-prompt'

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY no configurada. Agrégala en .env.local' },
        { status: 500 },
      )
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Mensajes inválidos' }, { status: 400 })
    }

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }))

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: BITTO_SYSTEM_PROMPT }],
          },
          contents,
          generationConfig: {
            temperature: 0.9,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 1024,
          },
        }),
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Error al comunicarse con los cartuchos cósmicos' },
        { status: 502 },
      )
    }

    const data = await response.json()

    const candidate = data.candidates?.[0]
    const text = candidate?.content?.parts?.[0]?.text

    if (!text) {
      const blockReason = candidate?.finishReason
      if (blockReason === 'SAFETY') {
        return NextResponse.json({
          message: {
            content:
              'Mmm... mis archivos antiguos se niegan a revelar esa información. ¿Podemos hablar de otra cosa?',
          },
        })
      }
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

import { NextRequest, NextResponse } from 'next/server'
import { BITTO_SYSTEM_PROMPT } from '@/lib/bitto-prompt'

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

    const groqMessages = [
      { role: 'system', content: BITTO_SYSTEM_PROMPT },
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

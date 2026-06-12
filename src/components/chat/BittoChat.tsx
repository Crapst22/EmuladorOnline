'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Bot, X, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const WELCOME: Message = {
  role: 'assistant',
  content:
    '¡Hola! Soy Bitto, el guardián de RetroVerse. Nací de los bits perdidos y datos olvidados de miles de videojuegos retro. ¿En qué puedo ayudarte hoy, aventurero?',
}

export default function BittoChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    const userMsg: Message = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages.slice(1), userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Error')

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.message.content },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            '¡Oh! Mis cartuchos cósmicos están teniendo problemas... ¿Puedes intentarlo de nuevo, aventurero?',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages])

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center',
          'retro-btn !rounded-full !p-0',
          'transition-all duration-300 hover:scale-110',
          isOpen && 'pointer-events-none scale-0 opacity-0',
        )}
        aria-label="Abrir chat con Bitto"
      >
        <Bot className="h-6 w-6" />
      </button>

      <div
        className={cn(
          'fixed bottom-6 right-6 z-50 flex w-[380px] flex-col',
          'retro-panel',
          'transition-all duration-300 origin-bottom-right',
          isOpen
            ? 'pointer-events-auto scale-100 opacity-100'
            : 'pointer-events-none scale-95 opacity-0',
        )}
        style={{ height: 540, maxHeight: 'calc(100vh - 4rem)' }}
      >
        <div className="retro-panel-dark flex items-center gap-2 border-b border-retro-gold/30 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-retro-gold/50 bg-retro-gold/20">
            <Bot className="h-4 w-4 text-retro-gold" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-pixel text-[0.5rem] leading-tight text-retro-gold">
              BITTO
            </h2>
            <p className="font-retro text-xs text-retro-gray-light">
              Guardián de RetroVerse
            </p>
          </div>
          <span className="flex h-2 w-2 rounded-full bg-retro-emerald shadow-[0_0_6px_rgba(80,200,120,0.6)]" />
          <button
            onClick={() => setIsOpen(false)}
            className="ml-2 rounded p-1 transition-colors hover:bg-retro-blue-dark/50"
            aria-label="Cerrar chat"
          >
            <X className="h-4 w-4 text-retro-gray-light" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex animate-slide-up gap-2',
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row',
              )}
              style={{ animationDuration: '0.3s' }}
            >
              {msg.role === 'assistant' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-retro-gold/50 bg-retro-gold/20">
                  <Bot className="h-3.5 w-3.5 text-retro-gold" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[85%] rounded-lg border px-3 py-2 text-sm leading-snug',
                  msg.role === 'user'
                    ? 'border-retro-blue/40 bg-retro-blue/30 text-white'
                    : 'border-retro-gold/20 bg-retro-blue-dark/80 text-retro-yellow',
                )}
              >
                <p className="font-retro text-base">{msg.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex animate-slide-up gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-retro-gold/50 bg-retro-gold/20">
                <Bot className="h-3.5 w-3.5 text-retro-gold" />
              </div>
              <div className="rounded-lg border border-retro-gold/20 bg-retro-blue-dark/80 px-4 py-3">
                <div className="retro-spinner !h-5 !w-5" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-retro-gold/30 p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu mensaje..."
              className="retro-input min-w-0 flex-1 text-sm"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="retro-btn !rounded-lg !p-2"
              aria-label="Enviar"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
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
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const cursorRef = useRef({ start: 0, end: 0 })
  const sendRef = useRef(() => {})

  useEffect(() => {
    if (pathname.startsWith('/play/')) {
      setIsOpen(false)
    }
  }, [pathname])

  useEffect(() => {
    if (!isOpen || !scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, isOpen])

  useEffect(() => {
    const restore = () => {
      const input = inputRef.current
      if (!input || !isOpen) return
      const { start, end } = cursorRef.current
      if (
        input.selectionStart !== start ||
        input.selectionEnd !== end
      ) {
        input.setSelectionRange(start, end)
      }
    }

    if (isOpen) {
      requestAnimationFrame(restore)
    }
  })

  useEffect(() => {
    const input = inputRef.current
    if (!input) return

    const track = () => {
      cursorRef.current = {
        start: input.selectionStart ?? 0,
        end: input.selectionEnd ?? 0,
      }
    }

    input.addEventListener('click', track)
    input.addEventListener('select', track)
    input.addEventListener('focus', track)
    input.addEventListener('keyup', track)
    return () => {
      input.removeEventListener('click', track)
      input.removeEventListener('select', track)
      input.removeEventListener('focus', track)
      input.removeEventListener('keyup', track)
    }
  }, [isOpen])

  useEffect(() => {
    const ta = inputRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [input])

  useEffect(() => {
    if (!isOpen) return

    const handler = (e: KeyboardEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) return

      e.stopPropagation()

      if (e.ctrlKey || e.altKey || e.metaKey) return

      if (e.key.length === 1) {
        e.preventDefault()
        const { start, end } = cursorRef.current
        setInput((prev) => prev.slice(0, start) + e.key + prev.slice(end))
        const pos = start + 1
        cursorRef.current = { start: pos, end: pos }
        return
      }

      const { start, end } = cursorRef.current
      const value = inputRef.current?.value ?? ''

      switch (e.key) {
        case 'Backspace': {
          e.preventDefault()
          if (start !== end) {
            setInput((prev) => prev.slice(0, start) + prev.slice(end))
            cursorRef.current = { start, end: start }
          } else if (start > 0) {
            setInput((prev) => prev.slice(0, start - 1) + prev.slice(start))
            cursorRef.current = { start: start - 1, end: start - 1 }
          }
          break
        }
        case 'Delete': {
          e.preventDefault()
          if (start !== end) {
            setInput((prev) => prev.slice(0, start) + prev.slice(end))
            cursorRef.current = { start, end: start }
          } else if (start < value.length) {
            setInput((prev) => prev.slice(0, start) + prev.slice(start + 1))
            cursorRef.current = { start, end: start }
          }
          break
        }
        case 'Enter': {
          e.preventDefault()
          if (inputRef.current?.value.trim()) {
            sendRef.current()
          }
          break
        }
        case 'ArrowLeft': {
          e.preventDefault()
          if (start > 0) {
            cursorRef.current = { start: start - 1, end: start - 1 }
          }
          break
        }
        case 'ArrowRight': {
          e.preventDefault()
          if (start < value.length) {
            cursorRef.current = { start: start + 1, end: start + 1 }
          }
          break
        }
        case 'Home': {
          e.preventDefault()
          cursorRef.current = { start: 0, end: 0 }
          break
        }
        case 'End': {
          e.preventDefault()
          const len = value.length
          cursorRef.current = { start: len, end: len }
          break
        }
      }
    }

    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [isOpen])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    const userMsg: Message = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    cursorRef.current = { start: 0, end: 0 }
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
      inputRef.current?.focus()
    }
  }, [input, isLoading, messages])

  useEffect(() => {
    sendRef.current = handleSend
  })

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          '!fixed bottom-12 right-12 z-50 flex h-14 w-14 items-center justify-center',
          'rounded-full border-2 border-retro-yellow bg-gradient-to-b from-retro-gold to-retro-gold-dark',
          'shadow-[0_3px_0_#7A6A00,0_4px_8px_rgba(0,0,0,0.4),0_0_15px_rgba(255,215,0,0.3)]',
          'transition-all duration-300 hover:scale-110 hover:shadow-[0_4px_0_#7A6A00,0_6px_12px_rgba(0,0,0,0.5),0_0_20px_rgba(255,215,0,0.5)]',
          'active:translate-y-1 active:shadow-[0_1px_0_#7A6A00]',
          isOpen && 'pointer-events-none scale-0 opacity-0',
        )}
        aria-label="Abrir chat con Bitto"
      >
        <Bot className="h-6 w-6 text-retro-blue-deep" />
      </button>

      <div
        ref={panelRef}
        className={cn(
          '!fixed bottom-12 right-12 z-50 flex w-[380px] flex-col',
          'border-2 border-retro-gold bg-gradient-to-br from-retro-blue-dark/95 to-retro-blue-deep/95',
          'shadow-[inset_0_0_15px_rgba(255,215,0,0.1),0_0_10px_rgba(255,215,0,0.15),2px_2px_0_#B8960F]',
          'transition-all duration-300 origin-bottom-right',
          isOpen
            ? 'pointer-events-auto scale-100 opacity-100'
            : 'pointer-events-none scale-95 opacity-0',
        )}
        style={{ height: 540, maxHeight: 'calc(100vh - 10rem)' }}
        onMouseDown={() => inputRef.current?.focus()}
      >
        <div className="flex items-center gap-2 border-b border-retro-gold/30 bg-gradient-to-b from-retro-blue-deep/98 to-retro-blue-dark/98 px-4 py-3">
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

        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto p-3"
        >
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
                    : 'border-retro-gold/20 bg-retro-blue-deep/80 text-retro-yellow',
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
              <div className="rounded-lg border border-retro-gold/20 bg-retro-blue-deep/80 px-4 py-3">
                <div className="retro-spinner !h-5 !w-5" />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-retro-gold/30 p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex gap-2"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Escribe tu mensaje..."
              rows={1}
              className="min-w-0 flex-1 resize-none rounded border-2 border-retro-gold/30 bg-retro-blue-deep/90 px-3 py-2 font-retro text-sm text-retro-gold shadow-inner outline-none transition-all placeholder:text-retro-gold/30 focus:border-retro-gold focus:shadow-[0_0_8px_rgba(255,215,0,0.2)]"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex items-center justify-center rounded border-2 border-retro-yellow bg-gradient-to-b from-retro-gold to-retro-gold-dark px-3 py-2 shadow-[0_2px_0_#7A6A00,0_2px_4px_rgba(0,0,0,0.3)] transition-all duration-100 active:translate-y-0.5 active:shadow-[0_0px_0_#7A6A00] disabled:opacity-40 disabled:shadow-none disabled:active:translate-y-0"
              aria-label="Enviar"
            >
              <Send className="h-4 w-4 text-retro-blue-deep" />
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

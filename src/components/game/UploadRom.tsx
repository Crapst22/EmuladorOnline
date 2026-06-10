'use client'

import { useState, useCallback } from 'react'
import { Upload, File, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { MAX_ROM_SIZE, ALLOWED_ROM_EXTENSIONS } from '@/lib/constants'
import { SUPPORTED_CONSOLES } from '@/types'
import type { ConsoleType } from '@/types'

interface UploadRomProps {
  onUploadComplete: () => void
}

export function UploadRom({ onUploadComplete }: UploadRomProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [consoleType, setConsoleType] = useState<ConsoleType>('snes')
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const validateFile = useCallback((f: File, consoleType: ConsoleType) => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase()
    const allowedForConsole = SUPPORTED_CONSOLES[consoleType]?.extensions || []
    if (!allowedForConsole.includes(ext)) {
      toast({ variant: 'error', title: 'ARCHIVO NO VALIDO', description: `${SUPPORTED_CONSOLES[consoleType]?.name} solo acepta: ${allowedForConsole.join(', ')}` })
      return false
    }
    if (f.size > MAX_ROM_SIZE) {
      toast({ variant: 'error', title: 'ARCHIVO MUY GRANDE', description: 'Maximo 50MB' })
      return false
    }
    return true
  }, [toast])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f && validateFile(f, consoleType)) setFile(f)
  }, [validateFile, consoleType])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f && validateFile(f, consoleType)) setFile(f)
  }

  async function computeFileHash(f: File): Promise<string> {
    const buffer = await f.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const handleUpload = async () => {
    if (!file || !title.trim()) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast({ variant: 'error', title: 'ERROR', description: 'No autenticado' })
      setLoading(false)
      return
    }

    const fileHash = await computeFileHash(file)

    const { data: hashMatch } = await supabase
      .from('games')
      .select('title')
      .eq('file_hash', fileHash)
      .limit(1)

    if (hashMatch && hashMatch.length > 0) {
      toast({
        variant: 'warning',
        title: 'ARCHIVO YA CARGADO',
        description: 'Ese archivo ROM ya fue subido por otro usuario. Fijate en la pantalla de Juegos Cargados.',
      })
      setLoading(false)
      return
    }

    const { data: titleMatch } = await supabase
      .from('games')
      .select('title')
      .ilike('title', title.trim())
      .limit(1)

    if (titleMatch && titleMatch.length > 0) {
      toast({
        variant: 'warning',
        title: 'JUEGO YA CARGADO',
        description: 'Ya existe un juego con ese nombre. Fijate en la pantalla de Juegos Cargados.',
      })
      setLoading(false)
      return
    }

    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    const filePath = `${user.id}/${crypto.randomUUID()}${ext}`

    const { error: uploadError } = await supabase.storage
      .from('roms')
      .upload(filePath, file)

    if (uploadError) {
      toast({ variant: 'error', title: 'ERROR AL SUBIR', description: uploadError.message })
      setLoading(false)
      return
    }

    const { error: dbError } = await supabase.from('games').insert({
      owner_id: user.id,
      title: title.trim(),
      console_type: consoleType,
      rom_path: filePath,
      file_hash: fileHash,
    })

    if (dbError) {
      await supabase.storage.from('roms').remove([filePath])
      toast({ variant: 'error', title: 'ERROR', description: 'Error al guardar' })
      setLoading(false)
      return
    }

    toast({ variant: 'success', title: 'ROM SUBIDA', description: `${title} agregada a tu biblioteca` })
    setOpen(false)
    setFile(null)
    setTitle('')
    onUploadComplete()
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          SUBIR ROM
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>SUBIR ROM</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">NOMBRE DEL JUEGO</Label>
            <Input
              id="title"
              placeholder="Ej: Final Fantasy VI"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>PLATAFORMA</Label>
            <div className="flex gap-2">
              {(Object.entries(SUPPORTED_CONSOLES) as [ConsoleType, typeof SUPPORTED_CONSOLES[ConsoleType]][]).map(([key, console]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setConsoleType(key); setFile(null) }}
                  className={`flex-1 py-2 px-3 font-pixel text-[0.5rem] border transition-all ${
                    consoleType === key
                      ? 'border-[#FFD700] bg-[#FFD700]/10 text-[#FFD700]'
                      : 'border-[#FFD700]/20 text-[#808080] hover:border-[#FFD700]/40'
                  }`}
                >
                  {console.name.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div
            className={`relative border-2 border-dashed p-8 text-center transition-colors ${
              dragOver ? 'border-[#FFD700] bg-[#FFD700]/5' : 'border-[#FFD700]/20 hover:border-[#FFD700]/40'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <File className="h-5 w-5 text-[#FFD700]" />
                <span className="font-retro text-base text-[#E0E0E0]">{file.name}</span>
                <button onClick={() => setFile(null)} className="text-[#808080] hover:text-[#FF2400]">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="mx-auto h-8 w-8 text-[#FFD700]/40 mb-2" />
                <p className="font-retro text-base text-[#A0A0A0]">
                  Arrastra tu ROM aqui o haz clic para seleccionar
                </p>
                <p className="font-retro text-sm text-[#808080] mt-1">{SUPPORTED_CONSOLES[consoleType]?.extensions.join(', ')} (max 50MB)</p>
              </div>
            )}
            <input
              type="file"
              accept={SUPPORTED_CONSOLES[consoleType]?.extensions.join(',')}
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={handleFileSelect}
            />
          </div>
          <Button className="w-full" onClick={handleUpload} disabled={!file || !title.trim() || loading}>
            {loading ? 'SUBIR...' : 'SUBIR ROM'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

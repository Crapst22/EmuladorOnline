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

interface UploadRomProps {
  onUploadComplete: () => void
}

export function UploadRom({ onUploadComplete }: UploadRomProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const validateFile = useCallback((f: File) => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_ROM_EXTENSIONS.includes(ext)) {
      toast({ variant: 'error', title: 'Archivo no válido', description: 'Solo se permiten archivos .smc, .sfc, .fig' })
      return false
    }
    if (f.size > MAX_ROM_SIZE) {
      toast({ variant: 'error', title: 'Archivo muy grande', description: 'Máximo 50MB' })
      return false
    }
    return true
  }, [toast])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f && validateFile(f)) setFile(f)
  }, [validateFile])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f && validateFile(f)) setFile(f)
  }

  const handleUpload = async () => {
    if (!file || !title.trim()) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast({ variant: 'error', title: 'Error', description: 'No autenticado' })
      setLoading(false)
      return
    }

    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    const filePath = `${user.id}/${crypto.randomUUID()}${ext}`

    const { error: uploadError } = await supabase.storage
      .from('roms')
      .upload(filePath, file)

    if (uploadError) {
      toast({ variant: 'error', title: 'Error al subir', description: uploadError.message })
      setLoading(false)
      return
    }

    const { error: dbError } = await supabase.from('games').insert({
      owner_id: user.id,
      title: title.trim(),
      console_type: 'snes',
      rom_path: filePath,
    })

    if (dbError) {
      await supabase.storage.from('roms').remove([filePath])
      toast({ variant: 'error', title: 'Error', description: 'Error al guardar' })
      setLoading(false)
      return
    }

    toast({ variant: 'success', title: 'ROM subida', description: `${title} agregada a tu biblioteca` })
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
          Subir ROM
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir ROM</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Nombre del juego</Label>
            <Input
              id="title"
              placeholder="Ej: Final Fantasy VI"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div
            className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              dragOver ? 'border-purple-500 bg-purple-500/5' : 'border-zinc-700 hover:border-zinc-600'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <File className="h-5 w-5 text-purple-400" />
                <span className="text-sm text-zinc-300">{file.name}</span>
                <button onClick={() => setFile(null)} className="text-zinc-500 hover:text-red-400">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
                <p className="text-sm text-zinc-400">
                  Arrastra tu ROM aquí o haz clic para seleccionar
                </p>
                <p className="text-xs text-zinc-600 mt-1">.smc, .sfc, .fig (máx 50MB)</p>
              </div>
            )}
            <input
              type="file"
              accept=".smc,.sfc,.fig"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={handleFileSelect}
            />
          </div>
          <Button className="w-full" onClick={handleUpload} disabled={!file || !title.trim() || loading}>
            {loading ? 'Subiendo...' : 'Subir ROM'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const MAX_ROM_SIZE = 50 * 1024 * 1024
export const ALLOWED_ROM_EXTENSIONS = ['.smc', '.sfc', '.fig']
export const MAX_SAVE_SIZE = 10 * 1024 * 1024
export const AUTO_SAVE_INTERVAL = 30000
export const SYNC_RETRY_INTERVAL = 5000

export const STORAGE_BUCKETS = {
  ROMS: 'roms',
  SAVES: 'saves',
  AVATARS: 'avatars',
} as const

export const APP_NAME = 'RetroCloud'
export const APP_TAGLINE = 'Tus clásicos, en cualquier lugar'

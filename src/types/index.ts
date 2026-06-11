export type ConsoleType = 'snes' | 'gba'

export interface ConsoleDefinition {
  id: ConsoleType
  name: string
  emulatorCore: string
  extensions: string[]
  saveFormat: 'srm' | 'state'
  controls: Record<string, string>
}

export const SUPPORTED_CONSOLES: Record<ConsoleType, ConsoleDefinition> = {
  snes: {
    id: 'snes',
    name: 'Super Nintendo',
    emulatorCore: 'snes9x',
    extensions: ['.smc', '.sfc', '.fig'],
    saveFormat: 'srm',
    controls: {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      z: 'a',
      x: 'b',
      a: 'x',
      s: 'y',
      Enter: 'start',
      Shift: 'select',
      q: 'l',
      w: 'r',
    },
  },
  gba: {
    id: 'gba',
    name: 'Game Boy Advance',
    emulatorCore: 'mgba',
    extensions: ['.gba'],
    saveFormat: 'srm',
    controls: {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      z: 'b',
      x: 'a',
      Enter: 'start',
      Shift: 'select',
      q: 'l',
      w: 'r',
    },
  },
}

export type SyncStatus = 'synced' | 'saving' | 'error' | 'offline'

export interface Game {
  id: string
  owner_id: string
  title: string
  console_type: ConsoleType
  rom_path: string
  cover_url?: string
  archived: boolean
  created_at: string
  updated_at: string
}

export interface Save {
  id: string
  game_id: string
  user_id: string
  save_path: string
  save_type: 'srm' | 'state'
  version: number
  updated_at: string
}

export interface PlaySession {
  id: string
  user_id: string
  game_id: string
  started_at: string
  ended_at?: string
}

export interface UserProfile {
  id: string
  username: string
  avatar_url?: string
  created_at: string
  is_admin?: boolean
}

export interface ConflictData {
  localSave: { data: string; date: Date }
  cloudSave: { data: string; date: Date }
}

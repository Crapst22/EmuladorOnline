# RetroCloud FF6

Plataforma web para jugar ROMs de Super Nintendo desde el navegador con sincronización automática de partidas entre dispositivos.

## Tecnologías

- **Frontend:** Next.js 15, React 19, TypeScript, TailwindCSS, shadcn/ui, Framer Motion
- **Backend:** Supabase (Auth, PostgreSQL, Storage, RLS)
- **Emulador:** EmulatorJS
- **Hosting:** Vercel (Frontend) + Supabase (Backend)

## Arquitectura

```
src/
├── app/
│   ├── (dashboard)/          # Rutas protegidas con layout compartido
│   │   ├── dashboard/        # Biblioteca de juegos
│   │   ├── profile/          # Perfil de usuario
│   │   └── settings/         # Configuración
│   ├── auth/                 # Autenticación (login, register, recover)
│   └── play/[id]/            # Página de juego con emulador
├── components/
│   ├── ui/                   # Componentes shadcn/ui
│   ├── emulator/             # EmulatorJS, controles táctiles, sync indicator
│   ├── layout/               # Navbar, MobileNav
│   └── game/                 # GameCard, GameList, UploadRom
├── hooks/                    # Custom hooks (useSync, useGamepad, etc.)
├── lib/                      # Utilidades, clientes Supabase, acciones
├── stores/                   # IndexedDB para offline-first
└── types/                    # Definiciones TypeScript
```

## Requisitos

- Node.js 18+
- npm
- Cuenta en Supabase (gratuita)
- Cuenta en Vercel (gratuita)
- ROMs de Super Nintendo (archivos .smc, .sfc, .fig) — **no se distribuyen ROMs**

## Configuración Local

### 1. Clonar e instalar

```bash
git clone <repo-url>
cd retrocloud-ff6
npm install
```

### 2. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta el contenido de `supabase/migrations/00001_initial.sql`
3. Ve a **Authentication** > **Settings** y configura:
   - `Site URL`: `http://localhost:3000`
   - `Redirect URLs`: `http://localhost:3000/auth/callback`
4. Ve a **Project Settings** > **API** y copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Configurar variables de entorno

Crea un archivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Instalar EmulatorJS

```bash
# Descargar EmulatorJS
curl -L https://github.com/EmulatorJS/EmulatorJS/archive/refs/heads/main.zip -o emulatorjs.zip
# Extraer en public/emulatorjs/
```

### 5. Iniciar desarrollo

```bash
npm run dev
```

## Despliegue

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Conecta tu repositorio de GitHub
2. Añade las variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`)
3. Despliega

### Supabase

1. En **Settings** > **API**, copia los valores de producción
2. Añade las URLs de producción en **Authentication** > **Settings**

## Uso

1. **Regístrate** con email y contraseña
2. **Sube tus ROMs** desde el dashboard
3. **Juega** desde cualquier dispositivo
4. Las **partidas se sincronizan automáticamente**

## Controles

### Teclado (PC)

| Botón | Tecla |
|-------|-------|
| Dirección | Flechas |
| A | Z |
| B | X |
| X | A |
| Y | S |
| Start | Enter |
| Select | Shift |
| L | Q |
| R | W |

### Táctil (Móvil)

Controles táctiles visibles automáticamente en dispositivos móviles con D-pad y botones de acción.

### Gamepad

Conecta un gamepad vía USB/Bluetooth — soporte automático para control SNES.

## Agregar Nuevas Consolas

1. En `src/types/index.ts`, añade la consola al tipo `ConsoleType` y a `SUPPORTED_CONSOLES`
2. Define: núcleo EmulatorJS, extensiones de archivo, formato de saves y mapeo de controles
3. Actualiza `ALLOWED_ROM_EXTENSIONS` en `src/lib/constants.ts`
4. La UI detectará automáticamente los nuevos tipos

## Licencia

MIT

const SEARCH_URL = 'https://www.eliteguias.com/?s='
const BASE_URL = 'https://www.eliteguias.com'

async function decodeResponse(res: Response): Promise<string> {
  const buffer = await res.arrayBuffer()

  const ct = res.headers.get('content-type') ?? ''
  const hasIso = ct.includes('iso-8859-1') || ct.includes('latin1')

  if (hasIso || res.url.includes('eliteguias.com')) {
    return new TextDecoder('latin1').decode(buffer)
  }

  return new TextDecoder('utf-8').decode(buffer)
}

function extractGuides(html: string): { title: string; url: string }[] {
  const guides: { title: string; url: string }[] = []

  const linkRegex = /<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  const links: { href: string; text: string }[] = []
  let m: RegExpExecArray | null

  while ((m = linkRegex.exec(html)) !== null) {
    const href = m[1]
    const text = m[2].replace(/<[^>]+>/g, '').trim()
    if (href && text) {
      links.push({ href, text })
    }
  }

  for (const link of links) {
    if (link.href.match(/^\/guias\/[a-z0-9]\//i)) {
      const fullUrl = link.href.startsWith('http')
        ? link.href
        : `${BASE_URL}${link.href}`
      if (!guides.some((g) => g.url === fullUrl)) {
        guides.push({ title: link.text, url: fullUrl })
      }
    }
  }

  return guides
}

function extractArticleContent(html: string): string {
  const articleRegex =
    /<article[\s\S]*?<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/article>/i
  const articleMatch = articleRegex.exec(html)

  let contentArea = ''

  if (articleMatch) {
    contentArea = articleMatch[1]
  } else {
    const mainRegex =
      /<div[^>]*id="contenedor"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i
    const mainMatch = mainRegex.exec(html)
    if (mainMatch) {
      contentArea = mainMatch[1]
    } else {
      contentArea = html
    }
  }

  const text = contentArea
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&aacute;/g, 'á')
    .replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&ntilde;/g, 'ñ')
    .replace(/&Aacute;/g, 'Á')
    .replace(/&Eacute;/g, 'É')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&Uacute;/g, 'Ú')
    .replace(/&Ntilde;/g, 'Ñ')
    .replace(/&iquest;/g, '¿')
    .replace(/&iexcl;/g, '¡')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_: string, code: string) =>
      String.fromCharCode(Number(code)),
    )
    .replace(/\s+/g, ' ')
    .trim()

  const lines = text.split(/(?<=[.!?])\s+/)
  const meaningful = lines.filter((l) => l.trim().length > 30)
  return meaningful.slice(0, 80).join('\n').slice(0, 5000)
}

function extractGameName(text: string): string | null {
  const patterns = [
    /(?:guía|guia|tutorial|ayuda)\s+(?:de|para|del|con|en)\s+(.+)/i,
    /(?:cofres?|items?|objetos?|tesoros?|secretos?)\s+(?:de|del|en|para)\s+(.+)/i,
    /(?:cómo paso|como paso|cómo pasar|como pasar)\s+(?:de|del|en|en\s+el|en\s+la)\s+(.+)/i,
    /(?:jefe|boss|nivel|level|mapa|misión|mision)\s+(?:de|del|en|para)\s+(.+)/i,
    /(.+?)(?:\s+(?:guía|guia|tutorial|walkthrough))/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }

  const gameKeywords =
    /(final\s+fantasy|ff\d+|zelda|mario|chrono\s+trigger|metroid|castlevania|megaman|sonic|pok[eé]mon|kirby|donkey\s+kong|street\s+fighter|resident\s+evil|silent\s+hill|metal\s+gear|god\s+of\s+war|elder\s+scrolls|fallout|witcher|dark\s+souls|elden\s+ring|eliteguias)/i

  const gameMatch = text.match(gameKeywords)
  if (gameMatch) {
    const idx = text.indexOf(gameMatch[1])
    return text.slice(Math.max(0, idx)).slice(0, 40).trim()
  }

  return null
}

export async function searchGuide(
  userMessage: string,
): Promise<{ title: string; url: string } | null> {
  try {
    const gameName = extractGameName(userMessage)
    if (!gameName) return null

    const searchTerm = gameName
      .replace(/[¿?¡!.,;:()]/g, '')
      .trim()

    if (searchTerm.length < 2) return null

    const res = await fetch(
      `${SEARCH_URL}${encodeURIComponent(searchTerm)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RetroVerseBot/1.0)',
        },
      },
    )

    if (!res.ok) return null

    const html = await decodeResponse(res)
    const guides = extractGuides(html)

    if (guides.length === 0) return null

    const queryLower = searchTerm.toLowerCase()
    const scored = guides.map((g) => {
      const titleLower = g.title.toLowerCase()
      let score = 0
      queryLower.split(/\s+/).forEach((word) => {
        if (word.length > 2 && titleLower.includes(word)) {
          score++
        }
      })
      if (titleLower.includes(queryLower)) score += 3
      return { ...g, score }
    })

    scored.sort((a, b) => b.score - a.score)
    return scored[0]
  } catch {
    return null
  }
}

export async function fetchGuideContent(
  url: string,
): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RetroVerseBot/1.0)',
      },
    })

    if (!res.ok) return null

    const html = await decodeResponse(res)
    return extractArticleContent(html)
  } catch {
    return null
  }
}

export function shouldSearchEliteguias(_text: string): boolean {
  return true
}

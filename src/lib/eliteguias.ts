const BASE_URL = 'https://www.eliteguias.com'

const KNOWN_GUIDES: Record<string, string> = {
  'final fantasy vi': '/guias/f/ff6/final-fantasy-vi.php',
  'final fantasy 6': '/guias/f/ff6/final-fantasy-vi.php',
  'final fantasy iii': '/guias/f/ff6/final-fantasy-vi.php',
  'ff6': '/guias/f/ff6/final-fantasy-vi.php',
  'final fantasy v': '/guias/f/ff5/final-fantasy-v.php',
  'final fantasy 5': '/guias/f/ff5/final-fantasy-v.php',
  'final fantasy vii': '/guias/f/ff7/final-fantasy-vii.php',
  'final fantasy 7': '/guias/f/ff7/final-fantasy-vii.php',
  'ff7': '/guias/f/ff7/final-fantasy-vii.php',
  'final fantasy vii rebirth': '/guias/f/ff7re/final-fantasy-vii-rebirth.php',
  'zelda tears of the kingdom': '/guias/t/tloztotk/the-legend-of-zelda-tears-of-the-kingdom.php',
  'zelda totk': '/guias/t/tloztotk/the-legend-of-zelda-tears-of-the-kingdom.php',
  'tears of the kingdom': '/guias/t/tloztotk/the-legend-of-zelda-tears-of-the-kingdom.php',
  'chrono trigger': '/guias/c/ct/chrono-trigger.php',
  'super mario rpg': '/guias/s/smrpg/super-mario-rpg.php',
  'earthbound': '/guias/e/eb/earthbound.php',
  'mother 2': '/guias/e/eb/earthbound.php',
  'secret of mana': '/guias/s/som/secret-of-mana.php',
  'seiken densetsu 2': '/guias/s/som/secret-of-mana.php',
  'illusions of gaia': '/guias/i/iof/illusions-of-gaia.php',
  'super metroid': '/guias/s/sm/super-metroid.php',
  'castlevania symphony of the night': '/guias/c/csotn/castlevania-symphony-of-the-night.php',
  'castlevania sotn': '/guias/c/csotn/castlevania-symphony-of-the-night.php',
  'megaman x': '/guias/m/mmx/megaman-x.php',
  'donkey kong country': '/guias/d/dkc/donkey-kong-country.php',
  'contra iii': '/guias/c/ci/contra-iii.php',
  'street fighter ii': '/guias/s/sf2/street-fighter-ii.php',
}

async function decodeResponse(res: Response): Promise<string> {
  const buffer = await res.arrayBuffer()
  const ct = res.headers.get('content-type') ?? ''
  const hasIso = ct.includes('iso-8859-1') || ct.includes('latin1')
  if (hasIso || res.url.includes('eliteguias.com')) {
    return new TextDecoder('latin1').decode(buffer)
  }
  return new TextDecoder('utf-8').decode(buffer)
}

function extractSections(
  html: string,
): { title: string; url: string }[] {
  const sections: { title: string; url: string }[] = []
  const regex =
    /<a\s+href="(\/guias\/[^"]+)"[^>]*class="[^"]*gmenu_sub[^"]*"[^>]*>([\s\S]*?)<\/a>/gi
  let m: RegExpExecArray | null
  while ((m = regex.exec(html)) !== null) {
    const title = m[2].replace(/<[^>]+>/g, '').replace(/^-\s*/, '').trim()
    const url = `${BASE_URL}${m[1]}`
    if (title && !sections.some((s) => s.url === url)) {
      sections.push({ title, url })
    }
  }
  return sections
}

function extractArticleContent(html: string): string {
  let contentArea = ''

  const startMatch = html.match(/<div\s+id="guias"[^>]*>/i)
  if (startMatch) {
    const startIdx = startMatch.index! + startMatch[0].length
    let depth = 1
    let i = startIdx
    const divOpen = /<div\b[^>]*>/gi
    const divClose = /<\/div\s*>/gi
    let nextOpen: RegExpExecArray | null
    let nextClose: RegExpExecArray | null

    while (depth > 0 && i < html.length) {
      divOpen.lastIndex = i
      divClose.lastIndex = i
      nextOpen = divOpen.exec(html)
      nextClose = divClose.exec(html)

      if (!nextClose) break

      if (nextOpen && nextOpen.index < nextClose.index) {
        depth++
        i = nextOpen.index + nextOpen[0].length
      } else {
        depth--
        i = nextClose.index + nextClose[0].length
      }
    }

    if (depth === 0) {
      contentArea = html.slice(startIdx, i - '</div>'.length)
    }
  }

  const text = contentArea
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
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

export function extractGameName(text: string): string | null {
  const clean = text.toLowerCase().trim()

  const gameKeys = Object.keys(KNOWN_GUIDES)
  for (const key of gameKeys) {
    if (clean.includes(key)) {
      return key
    }
  }

  const patterns = [
    /(?:guía|guia|tutorial|ayuda)\s+(?:de|para|del|con|en)\s+(.+)/i,
    /(?:cofres?|items?|objetos?|tesoros?|secretos?)\s+(?:de|del|en|para)\s+(.+)/i,
    /(?:jefe|boss|nivel|level|mapa|misión|mision)\s+(?:de|del|en|para)\s+(.+)/i,
    /(.+?)(?:\s+(?:guía|guia|tutorial|walkthrough))/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const name = match[1].trim()
      const nameLower = name.toLowerCase()
      for (const key of gameKeys) {
        if (nameLower.includes(key)) {
          return key
        }
      }
      return name
    }
  }

  return null
}

function scoreSectionRelevance(
  sectionTitle: string,
  userMessage: string,
): number {
  const msg = userMessage.toLowerCase()
  const title = sectionTitle.toLowerCase()
  let score = 0

  const words = msg.split(/\s+/)
  for (const word of words) {
    if (word.length > 2 && title.includes(word)) {
      score++
    }
  }

  const locationWords = [
    'castillo',
    'castle',
    'cueva',
    'cave',
    'torre',
    'tower',
    'bosque',
    'forest',
    'pueblo',
    'town',
    'ciudad',
    'city',
    'templo',
    'temple',
    'palacio',
    'palace',
    'isla',
    'island',
    'montaña',
    'montana',
    'montañas',
    'montanas',
    'montaã',
    'mountain',
    'mazmorra',
    'dungeon',
    'desierto',
    'desert',
    'mansión',
    'mansion',
    'laboratorio',
    'laboratory',
    'fábrica',
    'fabrica',
    'factory',
    'nave',
    'ship',
    'continente',
    'continent',
    'mundo',
    'world',
  ]

  for (const locWord of locationWords) {
    if (msg.includes(locWord) && title.includes(locWord)) {
      score += 5
    }
  }

  return score
}

export async function searchGuide(
  userMessage: string,
): Promise<{ title: string; url: string } | null> {
  const gameKey = extractGameName(userMessage)
  if (!gameKey) return null
  return searchGuideByKey(gameKey, userMessage)
}

export async function searchGuideByKey(
  gameKey: string,
  userMessage: string,
): Promise<{ title: string; url: string } | null> {
  try {
    const guidePath = KNOWN_GUIDES[gameKey]
    if (!guidePath) return null

    const res = await fetch(`${BASE_URL}${guidePath}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RetroVerseBot/1.0)',
      },
    })

    if (!res.ok) return null

    const html = await decodeResponse(res)
    const sections = extractSections(html)

    if (sections.length === 0) {
      return { title: gameKey, url: `${BASE_URL}${guidePath}` }
    }

    const scored = sections.map((s) => ({
      ...s,
      score: scoreSectionRelevance(s.title, userMessage),
    }))

    scored.sort((a, b) => b.score - a.score)
    const best = scored[0]

    return {
      title: `${gameKey} - ${best.title}`,
      url: best.url,
    }
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

export function shouldSearchEliteguias(text: string): boolean {
  return extractGameName(text) !== null
}

export function findGameInMessages(
  messages: { role: string; content: string }[],
): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      const name = extractGameName(messages[i].content)
      if (name) return name
    }
  }
  return null
}

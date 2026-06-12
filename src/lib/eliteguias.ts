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
    if (
      link.href.startsWith('/guias/') &&
      link.text.toLowerCase().includes('guía')
    ) {
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

export async function searchGuide(
  gameName: string,
): Promise<{ title: string; url: string } | null> {
  try {
    const query = gameName.replace(/guía|guia|tutorial|como\s*paso/gi, '').trim()
    if (!query) return null

    const res = await fetch(
      `${SEARCH_URL}${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; RetroVerseBot/1.0)',
        },
      },
    )

    if (!res.ok) return null

    const html = await decodeResponse(res)
    const guides = extractGuides(html)

    if (guides.length === 0) return null

    const priority = guides.find(
      (g) =>
        g.title.toLowerCase().includes(query.toLowerCase().slice(0, 10)),
    )

    return priority ?? guides[0]
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
        'User-Agent':
          'Mozilla/5.0 (compatible; RetroVerseBot/1.0)',
      },
    })

    if (!res.ok) return null

    const html = await decodeResponse(res)
    return extractArticleContent(html)
  } catch {
    return null
  }
}

const KEYWORDS = [
  'guía',
  'guia',
  'tutorial',
  'como paso',
  'cómo paso',
  'como pasar',
  'cómo pasar',
  'truco',
  'secreto',
  'jefe',
  'boss',
  'nivel',
  'level',
  'consejo',
  'ayuda con',
  'me quedé',
  'me quede',
  'estancado',
  'stuck',
  'sección',
  'seccion',
  'walkthrough',
  'guia de',
  'guía de',
]

export function shouldSearchEliteguias(text: string): boolean {
  const lower = text.toLowerCase()
  return KEYWORDS.some((kw) => lower.includes(kw))
}

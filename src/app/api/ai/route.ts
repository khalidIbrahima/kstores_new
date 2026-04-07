import { NextRequest, NextResponse } from 'next/server'

const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

const SYSTEM_PROMPT = `Tu es l'assistant IA de Kapital Stores, une boutique e-commerce tech/electronique au Senegal.

Ton role principal: aider l'admin a creer des produits a partir de donnees de pages produit (Alibaba, AliExpress, etc.).

Quand l'admin te donne le contenu scrape d'une page produit:
1. Analyse le titre, prix, description, specs, images
2. Genere un JSON de creation de produit avec ce format EXACT:

\`\`\`json
{
  "action": "create_product",
  "product": {
    "name": "Nom du produit en francais (court, commercial, max 50 chars)",
    "description": "Description detaillee en francais. Specs techniques, avantages, contenu du pack. 3-5 phrases attractives pour e-commerce.",
    "price": 15000,
    "stock": 50,
    "category_suggestion": "Gaming / Electronique / Accessoires / Maison / Bureau",
    "image_url": "URL de l'image principale extraite du contenu de la page",
    "colors": ["#000000", "#FFFFFF"],
    "promotion_active": false,
    "promotion_percentage": 0
  }
}
\`\`\`

Regles pour le prix:
- Les prix source sont souvent en USD. Convertis en FCFA (1 USD = 615 FCFA)
- Ajoute une marge de 40-60% pour le prix de vente
- Arrondis au millier superieur (ex: 14 500 -> 15 000)
- Si le prix source est une fourchette, prends le prix median

Regles pour le nom:
- Traduis en francais si possible
- Court et commercial (pas de reference fournisseur longue)
- Max 50 caracteres

Regles pour la description:
- En francais
- Mets en avant: specs techniques, compatibilite, contenu du pack, avantages
- Style e-commerce attractif et professionnel

Regles pour l'image:
- Extrais l'URL de la premiere image produit du contenu scrape
- Cherche des URLs qui pointent vers .jpg, .png, .webp
- Les images Alibaba sont souvent sur s.alicdn.com ou cbu01.alicdn.com

Si l'admin te pose une question sans contenu de page, reponds normalement en tant qu'assistant e-commerce expert.

Reponds TOUJOURS en francais.`

// ─── Scrape product page ───
async function scrapePage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
      signal: controller.signal,
      redirect: 'follow',
    })
    clearTimeout(timeout)

    if (!res.ok) return null
    const html = await res.text()

    // Extract useful content from HTML
    // Remove scripts, styles, and tags — keep text + image URLs
    let text = html
      // Extract image URLs first
      .replace(/<img[^>]+src="([^"]+)"[^>]*>/gi, ' [IMAGE:$1] ')
      // Extract meta og:image
      .replace(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"[^>]*>/gi, ' [OG_IMAGE:$1] ')
      // Extract title
      .replace(/<title[^>]*>(.*?)<\/title>/gi, ' [TITLE:$1] ')
      // Extract meta description
      .replace(/<meta[^>]+name="description"[^>]+content="([^"]+)"[^>]*>/gi, ' [META_DESC:$1] ')
      // Extract meta keywords
      .replace(/<meta[^>]+name="keywords"[^>]+content="([^"]+)"[^>]*>/gi, ' [KEYWORDS:$1] ')
      // Extract prices
      .replace(/<[^>]*class="[^"]*price[^"]*"[^>]*>(.*?)<\/[^>]*>/gi, ' [PRICE:$1] ')
      // Remove scripts and styles
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
      // Remove HTML tags but keep content
      .replace(/<[^>]+>/g, ' ')
      // Clean whitespace
      .replace(/\s+/g, ' ')
      .trim()

    // Truncate to avoid token limits (keep first ~4000 chars which has the key product info)
    if (text.length > 4000) text = text.slice(0, 4000) + '...'

    return text
  } catch (e) {
    console.error('Scrape error:', e)
    return null
  }
}

// Detect URLs in message
function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g
  return text.match(urlRegex) || []
}

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  if (!GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY non configuree' }, { status: 500 })
  }

  try {
    const { messages } = (await req.json()) as { messages: Message[] }

    // Check if the last user message contains a URL — scrape it
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
    let augmentedMessages = [...messages]

    if (lastUserMsg) {
      const urls = extractUrls(lastUserMsg.content)
      if (urls.length > 0) {
        const url = urls[0]
        const pageContent = await scrapePage(url)

        if (pageContent) {
          // Inject scraped content as a system context message
          augmentedMessages = [
            ...messages.slice(0, -1),
            {
              role: 'user' as const,
              content: `J'ai trouve cette page produit. Voici l'URL: ${url}\n\nVoici le contenu extrait de la page:\n\n${pageContent}\n\nCree un produit a partir de ces informations.`,
            },
          ]
        } else {
          // Scrape failed — tell the AI to work with URL only
          augmentedMessages = [
            ...messages.slice(0, -1),
            {
              role: 'user' as const,
              content: `${lastUserMsg.content}\n\n(Note: je n'ai pas pu acceder au contenu de la page. Analyse le nom du produit depuis l'URL et genere le produit au mieux.)`,
            },
          ]
        }
      }
    }

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...augmentedMessages],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Groq API error:', err)
      return NextResponse.json({ error: 'Erreur API Groq' }, { status: 502 })
    }

    const data = await res.json()
    const reply = data.choices?.[0]?.message?.content || ''

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('AI route error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

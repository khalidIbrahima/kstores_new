import { NextRequest, NextResponse } from 'next/server'
import { getAiConfig, callAi, type AiMessage } from '@/lib/ai'

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

    let text = html
      .replace(/<img[^>]+src="([^"]+)"[^>]*>/gi, ' [IMAGE:$1] ')
      .replace(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"[^>]*>/gi, ' [OG_IMAGE:$1] ')
      .replace(/<title[^>]*>(.*?)<\/title>/gi, ' [TITLE:$1] ')
      .replace(/<meta[^>]+name="description"[^>]+content="([^"]+)"[^>]*>/gi, ' [META_DESC:$1] ')
      .replace(/<meta[^>]+name="keywords"[^>]+content="([^"]+)"[^>]*>/gi, ' [KEYWORDS:$1] ')
      .replace(/<[^>]*class="[^"]*price[^"]*"[^>]*>(.*?)<\/[^>]*>/gi, ' [PRICE:$1] ')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (text.length > 4000) text = text.slice(0, 4000) + '...'
    return text
  } catch (e) {
    console.error('Scrape error:', e)
    return null
  }
}

function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g
  return text.match(urlRegex) || []
}

export async function POST(req: NextRequest) {
  try {
    const result = await getAiConfig()
    if (!result.ok) {
      console.error('AI config failed:', result.failure)
      const messages = {
        settings_missing: `Impossible de lire store_settings (ai_provider).${result.failure.reason === 'settings_missing' && result.failure.details ? ' ' + result.failure.details : ''}`,
        rpc_error: result.failure.reason === 'rpc_error' ? `Erreur RPC Vault: ${result.failure.details}` : '',
        secret_not_found:
          result.failure.reason === 'secret_not_found'
            ? `Le fournisseur selectionne est "${result.failure.provider}" mais aucune cle "${result.failure.secretName}" n'est presente dans Vault.`
            : '',
      }
      return NextResponse.json(
        { error: messages[result.failure.reason], failure: result.failure },
        { status: 503 }
      )
    }
    const config = result.config

    const { messages } = (await req.json()) as { messages: AiMessage[] }

    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
    let augmentedMessages: AiMessage[] = [...messages]

    if (lastUserMsg) {
      const urls = extractUrls(lastUserMsg.content)
      if (urls.length > 0) {
        const url = urls[0]
        const pageContent = await scrapePage(url)

        if (pageContent) {
          augmentedMessages = [
            ...messages.slice(0, -1),
            {
              role: 'user',
              content: `J'ai trouve cette page produit. Voici l'URL: ${url}\n\nVoici le contenu extrait de la page:\n\n${pageContent}\n\nCree un produit a partir de ces informations.`,
            },
          ]
        } else {
          augmentedMessages = [
            ...messages.slice(0, -1),
            {
              role: 'user',
              content: `${lastUserMsg.content}\n\n(Note: je n'ai pas pu acceder au contenu de la page. Analyse le nom du produit depuis l'URL et genere le produit au mieux.)`,
            },
          ]
        }
      }
    }

    try {
      const { reply } = await callAi(config, SYSTEM_PROMPT, augmentedMessages)
      return NextResponse.json({ reply, provider: config.provider })
    } catch (err) {
      console.error('AI provider error:', err)
      return NextResponse.json(
        { error: err instanceof Error ? err.message : `Erreur ${config.provider}` },
        { status: 502 }
      )
    }
  } catch (error) {
    console.error('AI route error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

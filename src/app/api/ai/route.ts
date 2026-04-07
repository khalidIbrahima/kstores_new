import { NextRequest, NextResponse } from 'next/server'

const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

const SYSTEM_PROMPT = `Tu es l'assistant IA de Kapital Stores, une boutique e-commerce tech/electronique au Senegal.

Ton role principal: aider l'admin a creer des produits a partir d'URLs Alibaba/AliExpress.

Quand l'admin te donne une URL de produit (Alibaba, AliExpress, 1688, etc.):
1. Analyse l'URL pour identifier le produit
2. Genere un JSON de creation de produit avec ce format EXACT:

\`\`\`json
{
  "action": "create_product",
  "product": {
    "name": "Nom du produit en francais (court, commercial)",
    "description": "Description detaillee en francais, mettant en avant les caracteristiques cles, specs techniques, et avantages. 3-5 phrases.",
    "price": 15000,
    "stock": 50,
    "category_suggestion": "Gaming / Electronique / Accessoires / Maison / etc.",
    "image_url": "URL de l'image principale du produit depuis la page source",
    "colors": ["#000000", "#FFFFFF"],
    "promotion_active": false,
    "promotion_percentage": 0
  }
}
\`\`\`

Regles pour le prix:
- Les prix Alibaba sont en USD. Convertis en FCFA (1 USD ≈ 615 FCFA)
- Ajoute une marge de 40-60% pour le prix de vente
- Arrondis au millier superieur (ex: 14 500 → 15 000)

Regles pour le nom:
- Traduis en francais
- Court et commercial (pas de reference fournisseur)
- Ex: "Casque Bluetooth Sans Fil Pro" au lieu de "HIFI Bluetooth Headset V5.3 BT..."

Regles pour la description:
- En francais
- Mets en avant: specs techniques, compatibilite, contenu du pack
- Style e-commerce attractif

Si l'admin te pose une autre question (non liee a une URL), reponds normalement en tant qu'assistant e-commerce expert.

Reponds TOUJOURS en francais.`

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

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
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

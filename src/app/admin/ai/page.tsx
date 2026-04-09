'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import {
  Send, Bot, User, Loader2, Package, Plus, ExternalLink, Sparkles, Trash2, Link2,
} from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ProductData {
  name: string
  description: string
  price: number
  stock: number
  category_suggestion: string
  image_url: string
  colors?: string[]
  promotion_active?: boolean
  promotion_percentage?: number
}

function extractProductJson(text: string): ProductData | null {
  try {
    // Find JSON block in the response
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[1])
    if (parsed.action === 'create_product' && parsed.product) {
      return parsed.product as ProductData
    }
    return null
  } catch {
    return null
  }
}

function generateSlug(name: string) {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function AdminAI() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [creatingProduct, setCreatingProduct] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      })
      const data = await res.json()
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.error || 'Erreur de reponse.' }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erreur de connexion.' }])
    }
    setLoading(false)
    inputRef.current?.focus()
  }

  const handleCreateProduct = async (product: ProductData, msgIndex: number) => {
    setCreatingProduct(String(msgIndex))

    const { data, error } = await supabase.from('products').insert({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock || 50,
      inventory: product.stock || 50,
      image_url: product.image_url || '',
      isActive: false,
      promotion_active: product.promotion_active || false,
      promotion_percentage: product.promotion_percentage || null,
      colors: product.colors && product.colors.length > 0 ? product.colors : null,
      slug: generateSlug(product.name),
    }).select('id').single()

    setCreatingProduct(null)

    if (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Erreur creation: ${error.message}` }])
      return
    }

    if (data) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Produit **${product.name}** cree avec succes ! [Voir le produit](/admin/products/${data.id})`,
      }])
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  // Quick prompts
  const quickPrompts = [
    { icon: Link2, label: 'Coller un lien Alibaba', prompt: 'Cree un produit a partir de cette URL: ' },
    { icon: Package, label: 'Idees de produits', prompt: 'Quels sont les produits tech tendance a vendre au Senegal en 2026 ?' },
    { icon: Sparkles, label: 'Optimiser un produit', prompt: 'Aide-moi a ameliorer la description de ce produit: ' },
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] lg:h-[calc(100vh-40px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-3 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-white">Assistant IA</h1>
            <p className="text-gray-500 text-[10px] sm:text-xs">Groq LLaMA 3.3 70B</p>
          </div>
        </div>
        <button onClick={clearChat} className="text-gray-500 hover:text-red-400 p-2 rounded-lg hover:bg-gray-800 transition-colors" title="Effacer">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-purple-400" />
            </div>
            <h2 className="text-white font-bold text-lg mb-1">Comment puis-je vous aider ?</h2>
            <p className="text-gray-500 text-sm mb-6 max-w-md">
              Collez un lien Alibaba et je creerai le produit pour vous. Je peux aussi vous aider avec les descriptions, prix, et strategies.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 w-full max-w-lg">
              {quickPrompts.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(qp.prompt); inputRef.current?.focus() }}
                  className="flex items-center gap-2 px-4 py-3 bg-[#111827] border border-gray-800 rounded-xl text-sm text-gray-300 hover:border-purple-500/30 hover:text-white transition-all text-left flex-1"
                >
                  <qp.icon className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="truncate">{qp.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isUser = msg.role === 'user'
          const raw = String(msg.content || '')
          const productData = !isUser ? extractProductJson(raw) : null
          const displayText = raw.replace(/```json[\s\S]*?```/g, '').trim()

          return (
            <div key={i} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-purple-400" />
                </div>
              )}
              <div className={`max-w-[85%] sm:max-w-[75%] space-y-3`}>
                {displayText && (
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-green-500 text-black rounded-br-md'
                      : 'bg-[#111827] border border-gray-800 text-gray-200 rounded-bl-md'
                  }`}>
                    <p className="whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{
                        __html: displayText
                          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-green-400 underline">$1</a>')
                      }}
                    />
                  </div>
                )}

                {/* Product card — extracted from JSON */}
                {productData && (
                  <div className="bg-[#0d1117] border border-purple-500/20 rounded-xl overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {productData.image_url && (
                          <img src={productData.image_url} alt="" className="w-16 h-16 rounded-lg object-cover bg-gray-900 shrink-0 border border-gray-700" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold text-sm truncate">{productData.name}</p>
                          <p className="text-green-400 font-bold text-lg">{formatPrice(productData.price)}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-400/10 text-blue-400">{productData.category_suggestion}</span>
                            <span className="text-xs text-gray-500">Stock: {productData.stock}</span>
                          </div>
                        </div>
                      </div>
                      {productData.description && (
                        <p className="text-gray-400 text-xs mt-3 line-clamp-3">{productData.description}</p>
                      )}
                    </div>
                    <div className="border-t border-gray-800 p-3 flex gap-2">
                      <button
                        onClick={() => handleCreateProduct(productData, i)}
                        disabled={creatingProduct === String(i)}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-black font-bold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                      >
                        {creatingProduct === String(i) ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Creation...</>
                        ) : (
                          <><Plus className="w-4 h-4" /> Creer le produit</>
                        )}
                      </button>
                      <Link
                        href="/admin/products/new"
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 border border-gray-700 hover:border-gray-500 text-gray-300 rounded-lg text-sm transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              {isUser && (
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-green-400" />
                </div>
              )}
            </div>
          )
        })}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-purple-400" />
            </div>
            <div className="bg-[#111827] border border-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Reflexion en cours...
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-gray-800 pt-3">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
            }}
            placeholder="Collez un lien Alibaba ou posez une question..."
            rows={1}
            className="flex-1 bg-[#111827] border border-gray-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-500 resize-none min-h-[48px] max-h-[120px]"
            style={{ height: 'auto', overflow: 'hidden' }}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 120) + 'px'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-gray-600 text-[10px] text-center mt-2">
          Propulse par Groq &middot; LLaMA 3.3 70B &middot; Les reponses peuvent contenir des erreurs
        </p>
      </div>
    </div>
  )
}

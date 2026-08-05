// Test d'envoi Telegram vers le groupe admin.
// Usage : node scripts/test-telegram.mjs
// Lit TELEGRAM_BOT_TOKEN et TELEGRAM_CHAT_ID_INFO depuis l'environnement ou .env.local.

import { readFileSync } from 'node:fs'

try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
} catch {
  // pas de .env.local — on compte sur l'environnement
}

const token = process.env.TELEGRAM_BOT_TOKEN
const chatId = process.env.TELEGRAM_CHAT_ID_INFO

if (!token || !chatId) {
  console.error('TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID_INFO manquant (.env.local ou environnement).')
  process.exit(1)
}

const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chat_id: chatId,
    text: `✅ Test notifications Telegram — ${new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Dakar' })}`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[
        { text: '💬 WhatsApp client', url: 'https://wa.me/221761800649?text=' + encodeURIComponent('Test bouton WhatsApp — Kapital Stores') },
        { text: '🧾 Voir la commande', url: 'https://kapitalstores.com/admin/orders' },
      ]],
    },
  }),
})

const json = await res.json()
console.log(JSON.stringify(json, null, 2))

if (!json.ok) {
  console.error('Échec de l\'envoi Telegram.')
  process.exit(1)
}
console.log('Message envoyé avec succès dans le groupe.')

import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Kapital Stores - Tech & Electronics'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #060a13 0%, #0a1628 50%, #060a13 100%)',
          fontFamily: 'Arial, Helvetica, sans-serif',
        }}
      >
        {/* Grid pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(rgba(34,197,94,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.05) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Green glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)',
          }}
        />

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          {/* K icon */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              background: '#111827',
              border: '3px solid #22c55e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
              fontWeight: 900,
              fontStyle: 'italic',
              color: '#22c55e',
            }}
          >
            K
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: 8, fontSize: 52, fontWeight: 900, fontStyle: 'italic', letterSpacing: -1 }}>
              <span style={{ color: '#ffffff' }}>KAPITAL</span>
              <span style={{ color: '#22c55e' }}>STORES</span>
            </div>
            <span style={{ fontSize: 14, color: '#6b7280', letterSpacing: 6, marginTop: 4 }}>TECH & ELECTRONICS</span>
          </div>
        </div>

        {/* Tagline */}
        <p style={{ fontSize: 24, color: '#9ca3af', textAlign: 'center', maxWidth: 600, lineHeight: 1.5, margin: 0 }}>
          Produits tech, electronique et gaming. Livraison rapide a Dakar et tout le Senegal.
        </p>

        {/* URL */}
        <div
          style={{
            marginTop: 32,
            padding: '10px 28px',
            borderRadius: 12,
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.3)',
            fontSize: 16,
            color: '#22c55e',
            fontWeight: 700,
          }}
        >
          kapitalstores.com
        </div>
      </div>
    ),
    { ...size }
  )
}

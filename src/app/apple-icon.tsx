import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: 'linear-gradient(135deg, #111827, #060a13)',
          border: '4px solid #22c55e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 100,
          fontWeight: 900,
          fontStyle: 'italic',
          fontFamily: 'Arial',
          color: '#22c55e',
        }}
      >
        K
      </div>
    ),
    { ...size }
  )
}

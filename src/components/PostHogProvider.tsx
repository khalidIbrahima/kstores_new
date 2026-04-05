'use client'

// PostHog removed — analytics now handled by custom Supabase tracking
// This component is kept as a passthrough to avoid breaking imports

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

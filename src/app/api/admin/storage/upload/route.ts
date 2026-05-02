import { NextResponse } from 'next/server'
import { withAdmin, bad } from '@/lib/api/admin-route'

const ALLOWED_BUCKETS = new Set(['product-media'])

export const POST = withAdmin(async (req, { supabase }) => {
  const formData = await req.formData()
  const file = formData.get('file')
  const bucket = String(formData.get('bucket') || 'product-media')
  const folder = String(formData.get('folder') || 'products')

  if (!ALLOWED_BUCKETS.has(bucket)) return bad(`Bucket "${bucket}" not allowed`)
  if (!(file instanceof File)) return bad('Missing file')
  if (!file.type.startsWith('image/')) return bad('File must be an image')

  const ext = file.name.split('.').pop() || 'bin'
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  })
  if (error) return bad(error.message, 500)

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return NextResponse.json({ success: true, path, publicUrl: data.publicUrl })
})

import Image from 'next/image'
import Link from 'next/link'
import { Category } from '@/lib/types'

export default function CategoriesShowcase({ categories }: { categories: Category[] }) {
  return (
    <section className="py-16 bg-[#0a0f1a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black italic text-white">
            Nos <span className="text-green-400">Catégories</span>
          </h2>
          <p className="text-gray-500 mt-2">Explorez notre sélection par catégorie</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map(cat => (
            <Link
              key={cat.id}
              href={`/products?category=${cat.slug}`}
              className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-gray-800 hover:border-green-500/50 transition-all"
            >
              {cat.cover_image_url && (
                <Image
                  src={cat.cover_image_url}
                  alt={cat.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-white font-bold text-lg">{cat.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

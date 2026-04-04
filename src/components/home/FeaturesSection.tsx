import { Shield, Truck, CreditCard } from 'lucide-react'

const features = [
  {
    icon: Shield,
    title: 'Articles de qualité',
    description: 'Nous nous assurons que tous les articles répondent à nos normes de qualité élevées',
  },
  {
    icon: Truck,
    title: 'Livraison rapide',
    description: 'Recevez vos commandes rapidement à votre porte. 1-2 jours à Dakar, 3-5 jours autres villes.',
  },
  {
    icon: CreditCard,
    title: 'Paiements sécurisés',
    description: 'Vos informations de paiement sont toujours sécurisées avec notre système crypté',
  },
]

export default function FeaturesSection() {
  return (
    <section className="py-16 bg-[#0a0f1a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map(feature => (
            <div
              key={feature.title}
              className="bg-[#111827] border border-gray-800 rounded-xl p-6 text-center hover:border-green-500/30 transition-all"
            >
              <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-7 h-7 text-green-400" />
              </div>
              <h3 className="text-white font-bold text-lg">{feature.title}</h3>
              <p className="text-gray-500 text-sm mt-2">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

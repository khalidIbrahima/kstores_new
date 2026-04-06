export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-2xl sm:text-3xl font-black italic text-white mb-8">
        Conditions <span className="text-green-400">Générales</span>
      </h1>
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 sm:p-8 space-y-6 text-gray-400 text-sm leading-relaxed">
        <section>
          <h2 className="text-white font-bold text-lg mb-3">1. Objet</h2>
          <p>Les présentes Conditions Générales d&apos;Utilisation (CGU) régissent l&apos;utilisation du site web Kapital Stores (kapitalstores.com) et de tous les services associés fournis par Kapital Stores.</p>
        </section>
        <section>
          <h2 className="text-white font-bold text-lg mb-3">2. Prix et Paiement</h2>
          <p>Les prix affichés sont en FCFA (XOF) et incluent la TVA. Nous acceptons les paiements par Wave, Orange Money, carte bancaire (Visa, Mastercard) et paiement à la livraison selon disponibilité.</p>
        </section>
        <section>
          <h2 className="text-white font-bold text-lg mb-3">3. Livraison</h2>
          <p>Nous livrons dans tout le Sénégal. Dakar : moins 3h en jours ouvrables. Autres villes : 5h à moins de 2 jours ouvrables. Livraison gratuite à Dakar pour les commandes de plus de 50 000 F CFA.</p>
        </section>
        <section>
          <h2 className="text-white font-bold text-lg mb-3">4. Droit applicable</h2>
          <p>Les présentes conditions sont régies par le droit sénégalais.</p>
        </section>
      </div>
    </div>
  )
}

export default function ReturnsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-2xl sm:text-3xl font-black italic text-white mb-8">
        Retours et <span className="text-green-400">Remboursements</span>
      </h1>
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 sm:p-8 space-y-6 text-gray-400 text-sm leading-relaxed">
        <section>
          <h2 className="text-white font-bold text-lg mb-3">Droit de rétractation</h2>
          <p>Vous disposez de 14 jours à compter de la réception de votre commande pour exercer votre droit de rétractation.</p>
        </section>
        <section>
          <h2 className="text-white font-bold text-lg mb-3">Conditions de retour</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Produit dans son état d&apos;origine</li>
            <li>Accessoires et documentation inclus</li>
            <li>Emballage complet et intact</li>
          </ul>
        </section>
        <section>
          <h2 className="text-white font-bold text-lg mb-3">Remboursement</h2>
          <p>Le remboursement sera effectué dans un délai de 14 jours après réception du retour, via le même mode de paiement utilisé lors de l&apos;achat.</p>
        </section>
        <section>
          <h2 className="text-white font-bold text-lg mb-3">Contact</h2>
          <p>Pour initier un retour, contactez-nous à <a href="mailto:support@kapitalstores.com" className="text-green-400 hover:text-green-300">support@kapitalstores.com</a> ou au <a href="tel:+221761800649" className="text-green-400 hover:text-green-300">+221 76 180 06 49</a>.</p>
        </section>
      </div>
    </div>
  )
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-black italic text-white mb-8">
        Politique de <span className="text-green-400">Confidentialité</span>
      </h1>
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 sm:p-8 space-y-6 text-gray-400 text-sm leading-relaxed">
        <section>
          <h2 className="text-white font-bold text-lg mb-3">Protection de vos données</h2>
          <p>Kapital Stores s&apos;engage à protéger votre vie privée. Cette politique décrit les données personnelles que nous collectons et comment nous les utilisons.</p>
        </section>
        <section>
          <h2 className="text-white font-bold text-lg mb-3">Vos droits</h2>
          <p>Conformément au RGPD et aux réglementations locales, vous avez les droits suivants :</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Droit d&apos;accès à vos données</li>
            <li>Droit de rectification</li>
            <li>Droit à l&apos;effacement</li>
            <li>Droit à la portabilité</li>
            <li>Droit d&apos;opposition</li>
          </ul>
        </section>
        <section>
          <h2 className="text-white font-bold text-lg mb-3">Contact</h2>
          <p>Pour toute question relative à vos données personnelles, contactez-nous à <a href="mailto:support@kapital-stores.shop" className="text-green-400 hover:text-green-300">support@kapital-stores.shop</a>.</p>
        </section>
      </div>
    </div>
  )
}

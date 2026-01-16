'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X as XIcon } from 'lucide-react'

export default function AcceptableUsePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              Viewtrace
            </Link>
            <div className="hidden md:block">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                Back to Home
              </Link>
            </div>
            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <XIcon className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
              <Link
                href="/"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                Back to Home
              </Link>
            </div>
          </div>
        )}
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Acceptable Use Policy</h1>

        <div className="bg-white rounded-lg shadow-sm p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Prohibited Uses</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You may not use Viewtrace:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>For any illegal purpose or to violate any laws</li>
              <li>To observe content you do not have permission to access</li>
              <li>To attempt to gain unauthorized access to systems or networks</li>
              <li>To interfere with or disrupt the service or servers</li>
              <li>To transmit any viruses, malware, or harmful code</li>
              <li>To use automated systems to abuse or overload our service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Content Restrictions</h2>
            <p className="text-gray-700 leading-relaxed">
              You are responsible for ensuring that any URLs you request observations for are URLs you own or have permission to observe. You may not use our service to observe content that violates third-party rights or applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Service Limitations</h2>
            <p className="text-gray-700 leading-relaxed">
              You agree not to exceed the observation limits of your plan. Excessive usage may result in rate limiting or account suspension.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Compliance</h2>
            <p className="text-gray-700 leading-relaxed">
              You agree to comply with all applicable laws and regulations when using Viewtrace. We do not provide IP access or proxies. We deliver recorded observations only.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Violations</h2>
            <p className="text-gray-700 leading-relaxed">
              Violation of this Acceptable Use Policy may result in immediate termination of your account without refund.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Contact</h2>
            <p className="text-gray-700 leading-relaxed">
              If you have any questions about this Acceptable Use Policy, please contact us at{' '}
              <a href="mailto:info@viewtrace.net" className="text-blue-600 hover:text-blue-800 underline">
                info@viewtrace.net
              </a>.
            </p>
          </section>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}



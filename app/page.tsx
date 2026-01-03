import Link from 'next/link'
import { ArrowRight, Check, X, Globe, Camera, FileText, Shield } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-gray-900">Viewtrace</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link>
              <Link href="#faq" className="text-gray-600 hover:text-gray-900">FAQ</Link>
              <Link href="/login" className="text-gray-600 hover:text-gray-900">Login</Link>
              <Link href="/signup" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="text-center">
          <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            See how your ads and landing pages appeared — at a specific time, in a specific region.
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Time-stamped visual observations for geo-targeted campaigns.<br />
            Not a guarantee. Just recorded snapshots you can reference.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 inline-flex items-center justify-center">
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link href="/sample" className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:border-gray-400">
              View Sample Observation
            </Link>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-12">
            Geo-targeted ads often fail silently.
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-start">
                <X className="h-6 w-6 text-red-500 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Ads approved but not shown</h3>
                  <p className="text-gray-600">Your ads pass review but don't appear to users in target regions.</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-start">
                <X className="h-6 w-6 text-red-500 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Users sent to the wrong country or language</h3>
                  <p className="text-gray-600">Geo-targeting misroutes users to incorrect landing pages.</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-start">
                <X className="h-6 w-6 text-red-500 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">State-specific content not loading</h3>
                  <p className="text-gray-600">Regional variations fail to display correctly.</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-start">
                <X className="h-6 w-6 text-red-500 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Redirects or 404 errors after ad clicks</h3>
                  <p className="text-gray-600">Broken links waste ad spend and damage trust.</p>
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-lg text-gray-700 mt-8 font-semibold">
            You still pay for every click — even when something breaks.
          </p>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Observe what real users would have seen.
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We capture time-stamped visual observations of how ads and landing pages
              appeared under selected regional conditions.
            </p>
            <p className="text-lg text-gray-600 mt-4 max-w-3xl mx-auto">
              No proxy access. No assumptions. No guarantees — just recorded results.
            </p>
          </div>

          {/* How It Works */}
          <div className="mt-16">
            <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">How It Works</h3>
            <div className="grid md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Enter a URL</h4>
                <p className="text-gray-600 text-sm">Provide the landing page or ad URL you want to observe.</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="h-8 w-8 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Select region (US / state)</h4>
                <p className="text-gray-600 text-sm">Choose the geographic location for observation.</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="h-8 w-8 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">We capture a visual observation</h4>
                <p className="text-gray-600 text-sm">Time-stamped screenshot at the specified conditions.</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Review screenshots and differences</h4>
                <p className="text-gray-600 text-sm">Compare observations and detect issues.</p>
              </div>
            </div>
            <p className="text-center text-sm text-gray-500 mt-8 italic">
              Observations represent conditions at the time of capture only.
            </p>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-12">Use Cases</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-8 rounded-lg shadow-sm text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Digital advertising agencies</h3>
              <p className="text-gray-600">Verify client campaigns across regions and catch issues before they impact performance.</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Shopify & DTC brands</h3>
              <p className="text-gray-600">Ensure geo-targeted promotions and landing pages display correctly for international customers.</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">SaaS marketing teams</h3>
              <p className="text-gray-600">Monitor regional campaign performance and troubleshoot localization issues.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Copy */}
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Know how your website actually looks — by location.
            </h2>
            <p className="text-xl text-gray-600 mb-2">
              Verified visual records, not just automated checks.
            </p>
            <p className="text-lg text-gray-500">
              Each observation captures how your site appeared, at a specific time, from a specific place.
            </p>
          </div>

          {/* Pricing Plans */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
            {/* Standard Coverage */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Standard Coverage</h3>
              <p className="text-sm text-gray-500 mb-4">Key regions visibility</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">$49</span>
                <span className="text-gray-600"> / month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">50 observations / month</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">U.S. + major countries</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">7 days retention</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">Full-page visual snapshots</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">Status history (success / failure)</span>
                </li>
              </ul>
              <Link href="/signup?plan=starter" className="block w-full bg-blue-600 text-white text-center px-6 py-3 rounded-lg font-semibold hover:bg-blue-700">
                Get Started
              </Link>
            </div>

            {/* Full Coverage - Popular */}
            <div className="bg-white border-2 border-blue-500 rounded-lg p-8 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                  ⭐ Most popular
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2 mt-2">Full Coverage</h3>
              <p className="text-sm text-gray-500 mb-1">Complete U.S. visibility with extended records</p>
              <p className="text-xs text-gray-400 mb-4">Chosen by teams that need full U.S. coverage and records.</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">$99</span>
                <span className="text-gray-600"> / month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">200 observations / month</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">All U.S. states</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">90 days retention</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">Full-page visual snapshots</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600 font-semibold">CSV export</span>
                </li>
              </ul>
              <p className="text-xs text-gray-500 mb-4 italic">Ideal for audits, reporting, and accountability</p>
              <Link href="/signup?plan=pro" className="block w-full bg-blue-600 text-white text-center px-6 py-3 rounded-lg font-semibold hover:bg-blue-700">
                Get Started
              </Link>
            </div>
          </div>

          {/* Observation Tooltip */}
          <div className="max-w-3xl mx-auto mb-12">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <p className="text-sm text-gray-700 text-center">
                <strong>An observation</strong> is a verified visual record of how your website appeared, at a specific time, from a specific location.
              </p>
            </div>
          </div>

          {/* Price Justification Copy */}
          <div className="max-w-3xl mx-auto">
            <p className="text-center text-gray-600 text-lg italic">
              We don't just detect changes.<br />
              We document what your users actually see — by location.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="bg-gray-50 py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-12">FAQ</h2>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Is this a guarantee that ads are working?
              </h3>
              <p className="text-gray-600">
                No. We provide observational records only, captured at a specific time and condition.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                What do we provide?
              </h3>
              <p className="text-gray-600">
                Unlike simple checks, observations show what users actually saw. We provide verified visual records of how your website appeared, at a specific time, from a specific location.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-gray-600">
                Yes. You can cancel anytime from your dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-bold text-lg mb-4">Viewtrace</h4>
              <p className="text-sm">
                Visual observations for geo-targeted campaigns.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="#faq" className="hover:text-white">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/acceptable-use" className="hover:text-white">Acceptable Use Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8">
            <p className="text-sm text-center text-gray-400">
              Results represent observations at the time of capture and do not guarantee
              ongoing availability, correctness, or performance.
            </p>
            <p className="text-sm text-center text-gray-500 mt-4">
              © {new Date().getFullYear()} Viewtrace. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}


import Link from 'next/link'
import { ArrowLeft, Check, AlertCircle } from 'lucide-react'

export default function SamplePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              Viewtrace
            </Link>
            <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Sample Observation</h1>
          <div className="mb-6">
            <p className="text-gray-600 mb-2">
              <span className="font-semibold">URL:</span> https://example.com/landing-page
            </p>
            <p className="text-gray-600 mb-2">
              <span className="font-semibold">Region:</span> US - California
            </p>
            <p className="text-gray-600">
              <span className="font-semibold">Captured:</span> 2024-01-15 14:30:00 UTC
            </p>
          </div>

          <div className="mb-6">
            <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold inline-flex items-center">
              <Check className="h-4 w-4 mr-2" />
              No visible issues detected at capture time
            </span>
          </div>

          <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50 mb-6">
            <div className="aspect-video bg-white rounded flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-500 mb-2">Sample Screenshot</p>
                <p className="text-sm text-gray-400">This is a placeholder for the actual observation screenshot</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This observation represents conditions at the time of capture only. 
              Results do not guarantee ongoing availability, correctness, or performance.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Observation Details</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Status</h3>
                <p className="text-gray-600">Observed</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Page Load</h3>
                <p className="text-gray-600">Successful</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Content Display</h3>
                <p className="text-gray-600">All elements visible</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Regional Content</h3>
                <p className="text-gray-600">California-specific content detected</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/signup"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            Start Your Free Trial
          </Link>
        </div>
      </div>
    </div>
  )
}



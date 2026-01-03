'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'

const US_STATES = [
  { value: 'US-AL', label: 'Alabama' },
  { value: 'US-AK', label: 'Alaska' },
  { value: 'US-AZ', label: 'Arizona' },
  { value: 'US-AR', label: 'Arkansas' },
  { value: 'US-CA', label: 'California' },
  { value: 'US-CO', label: 'Colorado' },
  { value: 'US-CT', label: 'Connecticut' },
  { value: 'US-DE', label: 'Delaware' },
  { value: 'US-FL', label: 'Florida' },
  { value: 'US-GA', label: 'Georgia' },
  { value: 'US-HI', label: 'Hawaii' },
  { value: 'US-ID', label: 'Idaho' },
  { value: 'US-IL', label: 'Illinois' },
  { value: 'US-IN', label: 'Indiana' },
  { value: 'US-IA', label: 'Iowa' },
  { value: 'US-KS', label: 'Kansas' },
  { value: 'US-KY', label: 'Kentucky' },
  { value: 'US-LA', label: 'Louisiana' },
  { value: 'US-ME', label: 'Maine' },
  { value: 'US-MD', label: 'Maryland' },
  { value: 'US-MA', label: 'Massachusetts' },
  { value: 'US-MI', label: 'Michigan' },
  { value: 'US-MN', label: 'Minnesota' },
  { value: 'US-MS', label: 'Mississippi' },
  { value: 'US-MO', label: 'Missouri' },
  { value: 'US-MT', label: 'Montana' },
  { value: 'US-NE', label: 'Nebraska' },
  { value: 'US-NV', label: 'Nevada' },
  { value: 'US-NH', label: 'New Hampshire' },
  { value: 'US-NJ', label: 'New Jersey' },
  { value: 'US-NM', label: 'New Mexico' },
  { value: 'US-NY', label: 'New York' },
  { value: 'US-NC', label: 'North Carolina' },
  { value: 'US-ND', label: 'North Dakota' },
  { value: 'US-OH', label: 'Ohio' },
  { value: 'US-OK', label: 'Oklahoma' },
  { value: 'US-OR', label: 'Oregon' },
  { value: 'US-PA', label: 'Pennsylvania' },
  { value: 'US-RI', label: 'Rhode Island' },
  { value: 'US-SC', label: 'South Carolina' },
  { value: 'US-SD', label: 'South Dakota' },
  { value: 'US-TN', label: 'Tennessee' },
  { value: 'US-TX', label: 'Texas' },
  { value: 'US-UT', label: 'Utah' },
  { value: 'US-VT', label: 'Vermont' },
  { value: 'US-VA', label: 'Virginia' },
  { value: 'US-WA', label: 'Washington' },
  { value: 'US-WV', label: 'West Virginia' },
  { value: 'US-WI', label: 'Wisconsin' },
  { value: 'US-WY', label: 'Wyoming' },
]

export default function NewObservationPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [selectedRegion, setSelectedRegion] = useState<string>('US-CA')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!selectedRegion) {
      setError('Please select a region')
      return
    }
    
    setLoading(true)

    try {
      const response = await fetch('/api/observations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, regions: [selectedRegion] }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create observations')
        setLoading(false)
        return
      }

      // Redirect to observations list page to see all created observations
      router.push('/dashboard/observations')
    } catch (err) {
      console.error('Error creating observations:', err)
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/dashboard/observations"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Observations
        </Link>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Observation</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                URL
              </label>
              <input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/landing-page"
                className="w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
                required
              />
              <p className="mt-2 text-sm text-gray-500">
                Enter the URL of the page you want to observe
              </p>
            </div>

            <div>
              <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-2">
                Region
              </label>
              <select
                id="region"
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                required
              >
                {US_STATES.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-gray-500">
                Select a geographic region to check. Only one region can be selected at a time for faster processing.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-4">
              <Link
                href="/dashboard/observations"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
              >
                {loading ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Observation'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}

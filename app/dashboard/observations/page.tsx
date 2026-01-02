'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Clock, CheckCircle, XCircle, Loader, Plus, Globe } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'

interface Observation {
  id: string
  url: string
  region: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result_status: string | null
  screenshot_url: string | null
  captured_at: string | null
  created_at: string
}

const STATUS_CONFIG = {
  pending: { label: 'Queued', icon: Clock, color: 'text-yellow-600 bg-yellow-100' },
  running: { label: 'Running', icon: Loader, color: 'text-blue-600 bg-blue-100' },
  completed: { label: 'Succeeded', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
  failed: { label: 'Failed', icon: XCircle, color: 'text-red-600 bg-red-100' },
}

const RESULT_STATUS_CONFIG = {
  observed: { label: 'Observed', color: 'text-green-600 bg-green-100' },
  difference_observed: { label: 'Difference observed', color: 'text-amber-600 bg-amber-100' },
  no_issues: { label: 'No visible issues detected at capture time', color: 'text-green-600 bg-green-100' },
}

export default function ObservationsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [observations, setObservations] = useState<Observation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      fetchObservations()
      // Poll for updates every 5 seconds
      const interval = setInterval(() => {
        fetchObservations()
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [user, authLoading, router])

  const fetchObservations = async () => {
    try {
      const response = await fetch(`/api/observations?t=${Date.now()}`)
      if (response.ok) {
        const data = await response.json()
        setObservations(data.observations || [])
        setError(null)
      } else {
        setError('Failed to fetch observations')
      }
    } catch (err) {
      console.error('Error fetching observations:', err)
      setError('Failed to fetch observations')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: Observation['status']) => {
    const config = STATUS_CONFIG[status]
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        <Icon className="h-3 w-3 mr-1 ${status === 'running' ? 'animate-spin' : ''}" />
        {config.label}
      </span>
    )
  }

  const getResultStatusBadge = (resultStatus: string | null) => {
    if (!resultStatus) return null
    const config = RESULT_STATUS_CONFIG[resultStatus as keyof typeof RESULT_STATUS_CONFIG]
    if (!config) return null
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        {config.label}
      </span>
    )
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading observations...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Observations</h1>
          <Link
            href="/dashboard/observations/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Observation
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {observations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-600 mb-4">No observations yet.</p>
            <Link
              href="/dashboard/observations/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Observation
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Region
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Result
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {observations.map((observation) => (
                    <tr key={observation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(observation.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={observation.url}>
                          {observation.url}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Globe className="h-4 w-4 mr-1" />
                          {observation.region}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getResultStatusBadge(observation.result_status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(observation.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          href={`/dashboard/observations/${observation.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}


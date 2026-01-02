'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, CheckCircle, XCircle, Loader, Globe } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Disclaimer from '@/components/Disclaimer'
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

export default function ObservationDetailPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const observationId = params.id as string
  const [observation, setObservation] = useState<Observation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    if (user && observationId) {
      fetchObservation()
      // Poll for updates if status is pending or running, or if screenshot is missing
      const interval = setInterval(() => {
        if (!observation) {
          fetchObservation()
        } else if (
          observation.status === 'pending' || 
          observation.status === 'running' ||
          (!observation.screenshot_url && observation.status !== 'failed')
        ) {
          fetchObservation()
        }
      }, 3000) // Poll every 3 seconds

      return () => clearInterval(interval)
    }
  }, [user, authLoading, observationId, router, observation?.status])

  const fetchObservation = async () => {
    try {
      // Try to fetch single observation first
      let response = await fetch(`/api/observations/${observationId}?t=${Date.now()}`)
      if (response.ok) {
        const data = await response.json()
        if (data.observation) {
          console.log('Fetched observation:', data.observation)
          setObservation(data.observation)
          setLoading(false)
          return
        }
      }
      
      // Fallback to fetching all observations
      response = await fetch(`/api/observations?t=${Date.now()}`)
      if (response.ok) {
        const data = await response.json()
        const obs = data.observations?.find((o: Observation) => o.id === observationId)
        if (obs) {
          console.log('Fetched observation from list:', obs)
          setObservation(obs)
        }
      }
    } catch (error) {
      console.error('Error fetching observation:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!observation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Observation not found</p>
          <Link href="/dashboard/observations" className="text-blue-600 hover:text-blue-700">
            Back to Observations
          </Link>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    })
  }

  const getStatusBadge = (status: Observation['status']) => {
    const config = STATUS_CONFIG[status]
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${config.color}`}>
        <Icon className="h-4 w-4 mr-1" />
        {config.label}
      </span>
    )
  }

  const getResultStatusBadge = (resultStatus: string | null) => {
    if (!resultStatus) return null
    const config = RESULT_STATUS_CONFIG[resultStatus as keyof typeof RESULT_STATUS_CONFIG]
    if (!config) return null
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${config.color}`}>
        {config.label}
      </span>
    )
  }

  return (
    <DashboardLayout>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard/observations" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Observations
        </Link>

        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Observation Details</h1>
            {getStatusBadge(observation.status)}
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">URL</h3>
              <p className="text-gray-900 break-all">{observation.url}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Region</h3>
              <p className="text-gray-900 flex items-center">
                <Globe className="h-4 w-4 mr-2" />
                {observation.region}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Created</h3>
              <p className="text-gray-900">{formatDate(observation.created_at)}</p>
            </div>
            {observation.captured_at && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Captured At</h3>
                <p className="text-gray-900">{formatDate(observation.captured_at)}</p>
              </div>
            )}
          </div>

          {observation.result_status && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Result Status</h3>
              {getResultStatusBadge(observation.result_status)}
            </div>
          )}

          {/* Observation Conditions */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Observation Conditions</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Time of Capture:</span>
                <span className="text-sm font-medium text-gray-900">
                  {observation.captured_at ? formatDate(observation.captured_at) : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Region:</span>
                <span className="text-sm font-medium text-gray-900">{observation.region}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">User Agent:</span>
                <span className="text-sm font-medium text-gray-900">Standard Browser</span>
              </div>
            </div>
          </div>
        </div>

        {/* Screenshot */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Screenshot</h2>
          {observation.screenshot_url ? (
            <>
              <div className="border-2 border-gray-200 rounded-lg overflow-hidden mb-4 bg-gray-100">
                <img
                  src={observation.screenshot_url}
                  alt="Observation screenshot"
                  className="w-full h-auto"
                  loading="lazy"
                  onError={(e) => {
                    console.error('Image load error:', observation.screenshot_url)
                    const target = e.target as HTMLImageElement
                    const parent = target.parentElement
                    if (parent) {
                      parent.innerHTML = `
                        <div class="p-12 text-center bg-gray-50">
                          <p class="text-gray-500 mb-2">Failed to load screenshot</p>
                          <p class="text-sm text-gray-400">URL: ${observation.screenshot_url}</p>
                        </div>
                      `
                    }
                  }}
                  onLoad={() => {
                    console.log('Screenshot loaded successfully:', observation.screenshot_url)
                  }}
                />
              </div>
              {/* Disclaimer - Always displayed below screenshot */}
              <Disclaimer />
            </>
          ) : (
            <>
              <div className="border-2 border-gray-200 rounded-lg p-12 text-center bg-gray-50 mb-4">
                {observation.status === 'pending' || observation.status === 'running' ? (
                  <div>
                    <Loader className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
                    <p className="text-gray-600">Processing observation...</p>
                  </div>
                ) : (
                  <p className="text-gray-500">Screenshot not available</p>
                )}
              </div>
              {/* Disclaimer - Always displayed even when screenshot is not available */}
              <Disclaimer />
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}


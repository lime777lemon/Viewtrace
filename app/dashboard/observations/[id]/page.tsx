'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, CheckCircle, XCircle, Loader, Globe, Grid, List, ExternalLink, Maximize2, X, History, GitCompare, AlertCircle, Ban, RotateCw } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Disclaimer from '@/components/Disclaimer'
import DashboardLayout from '@/components/DashboardLayout'

interface Observation {
  id: string
  url: string
  region: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  result_status: string | null
  screenshot_url: string | null
  text_content: string | null
  captured_at: string | null
  created_at: string
}

const STATUS_CONFIG = {
  pending: { label: 'Queued', icon: Clock, color: 'text-yellow-600 bg-yellow-100' },
  running: { label: 'Running', icon: Loader, color: 'text-blue-600 bg-blue-100' },
  completed: { label: 'Succeeded', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
  failed: { label: 'Failed', icon: XCircle, color: 'text-red-600 bg-red-100' },
  cancelled: { label: 'Cancelled', icon: Ban, color: 'text-gray-600 bg-gray-100' },
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
  const [relatedObservations, setRelatedObservations] = useState<Observation[]>([])
  const [historyObservations, setHistoryObservations] = useState<Observation[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'single' | 'compare' | 'history' | 'diff'>('single')
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number>(0)
  const [comparisonData, setComparisonData] = useState<any>(null)
  const [textComparisonData, setTextComparisonData] = useState<any>(null)
  const [comparing, setComparing] = useState(false)
  const [comparingText, setComparingText] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [retrying, setRetrying] = useState(false)

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
          (!observation.screenshot_url && observation.status !== 'failed' && observation.status !== 'cancelled')
        ) {
          fetchObservation()
        }
      }, 1000) // Poll every 1 second for faster updates

      return () => clearInterval(interval)
    }
  }, [user, authLoading, observationId, router, observation?.status])

  // Handle ESC key to close fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreenImage) {
        setFullscreenImage(null)
      }
    }
    if (fullscreenImage) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [fullscreenImage])

  const fetchObservation = async () => {
    try {
      // Fetch observation with related observations
      const response = await fetch(`/api/observations/${observationId}?t=${Date.now()}`)
      if (response.ok) {
        const data = await response.json()
        if (data.observation) {
          const prevStatus = observation?.status
          const newStatus = data.observation.status
          
          // Log status changes for debugging
          if (prevStatus !== newStatus) {
            console.log(`Observation status changed: ${prevStatus} -> ${newStatus}`)
          }
          
          setObservation(data.observation)
          setRelatedObservations(data.relatedObservations || [])
          setHistoryObservations(data.historyObservations || [])
          setLoading(false)
          return
        }
      }
      
      // Fallback to fetching all observations
      const fallbackResponse = await fetch(`/api/observations?t=${Date.now()}`)
      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json()
        const obs = data.observations?.find((o: Observation) => o.id === observationId)
        if (obs) {
          console.log('Fetched observation from list:', obs)
          setObservation(obs)
          // Find related observations with same URL
          const related = data.observations?.filter((o: Observation) => 
            o.url === obs.url && o.id !== obs.id
          ) || []
          setRelatedObservations(related)
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

  const compareWithHistory = async (historyId: string) => {
    if (!observation) return
    
    setComparing(true)
    setComparingText(true)
    try {
      // Compare images
      const imageResponse = await fetch(`/api/observations/${observationId}/compare?compareWith=${historyId}`)
      if (imageResponse.ok) {
        const imageData = await imageResponse.json()
        setComparisonData(imageData)
      }

      // Compare text
      const textResponse = await fetch(`/api/observations/${observationId}/compare-text?compareWith=${historyId}`)
      if (textResponse.ok) {
        const textData = await textResponse.json()
        setTextComparisonData(textData)
      } else if (textResponse.status === 400) {
        // Text content might not be available (for older observations)
        setTextComparisonData(null)
      }
      
      setViewMode('diff')
    } catch (error) {
      console.error('Error comparing observations:', error)
    } finally {
      setComparing(false)
      setComparingText(false)
    }
  }

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return formatDate(dateString)
  }

  const handleCancel = async () => {
    if (!observation) return
    
    if (!confirm('Are you sure you want to cancel this observation? This action cannot be undone.')) {
      return
    }

    setCancelling(true)
    try {
      const response = await fetch(`/api/observations/${observationId}/cancel`, {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        setObservation(data.observation)
        // Refresh the observation
        fetchObservation()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to cancel observation')
      }
    } catch (error) {
      console.error('Error cancelling observation:', error)
      alert('An error occurred while cancelling the observation')
    } finally {
      setCancelling(false)
    }
  }

  const handleRetry = async () => {
    if (!observation) return
    
    const confirmMessage = observation.status === 'failed'
      ? 'Retry this failed observation? The previous screenshot and data will be cleared and processing will start again.'
      : 'Retry this cancelled observation? The previous screenshot and data will be cleared and processing will start again.'
    
    if (!confirm(confirmMessage)) {
      return
    }

    setRetrying(true)
    try {
      const response = await fetch(`/api/observations/${observationId}/retry`, {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        setObservation(data.observation)
        // Refresh the observation
        fetchObservation()
        // Don't show alert, just update the UI - the status change will be visible
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to retry observation')
      }
    } catch (error) {
      console.error('Error retrying observation:', error)
      alert('An error occurred while retrying the observation')
    } finally {
      setRetrying(false)
    }
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
            <div className="flex items-center gap-4">
              {(observation.status === 'pending' || observation.status === 'running') && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelling ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <Ban className="h-4 w-4 mr-2" />
                      Cancel
                    </>
                  )}
                </button>
              )}
              <div className="flex items-center gap-2 border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('single')}
                  className={`px-4 py-2 text-sm font-medium ${
                    viewMode === 'single'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <List className="h-4 w-4 inline mr-1" />
                  Single
                </button>
                {relatedObservations.length > 0 && (
                  <button
                    onClick={() => setViewMode('compare')}
                    className={`px-4 py-2 text-sm font-medium ${
                      viewMode === 'compare'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Grid className="h-4 w-4 inline mr-1" />
                    Compare ({relatedObservations.length + 1})
                  </button>
                )}
                {historyObservations.length > 0 && (
                  <>
                    <button
                      onClick={() => setViewMode('history')}
                      className={`px-4 py-2 text-sm font-medium ${
                        viewMode === 'history'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <History className="h-4 w-4 inline mr-1" />
                      History ({historyObservations.length + 1})
                    </button>
                    <button
                      onClick={() => {
                        if (historyObservations.length > 0 && historyObservations[0].screenshot_url) {
                          compareWithHistory(historyObservations[0].id)
                        }
                      }}
                      disabled={comparing || !historyObservations[0]?.screenshot_url}
                      className={`px-4 py-2 text-sm font-medium ${
                        viewMode === 'diff'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <GitCompare className="h-4 w-4 inline mr-1" />
                      {comparing ? 'Comparing...' : 'Detect Changes'}
                    </button>
                  </>
                )}
              </div>
              {getStatusBadge(observation.status)}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">URL</h3>
              <div className="flex items-center gap-2">
                <p className="text-gray-900 break-all">{observation.url}</p>
                <a
                  href={observation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
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

        {/* History Timeline View */}
        {viewMode === 'history' && historyObservations.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">History Timeline</h2>
                <p className="text-sm text-gray-600 mt-1">
                  View past observations for {observation.url} in {observation.region}
                </p>
              </div>
            </div>

            {/* Timeline Slider */}
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <label className="text-sm font-medium text-gray-700">
                  Select observation:
                </label>
                <input
                  type="range"
                  min="0"
                  max={historyObservations.length}
                  value={selectedHistoryIndex}
                  onChange={(e) => setSelectedHistoryIndex(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-600 min-w-[120px]">
                  {selectedHistoryIndex === 0 ? 'Current' : `${selectedHistoryIndex} ago`}
                </span>
              </div>

              {/* Timeline markers */}
              <div className="flex items-center gap-2 mb-6">
                {[0, ...historyObservations].map((_, idx) => {
                  const obs = idx === 0 ? observation : historyObservations[idx - 1]
                  const isSelected = idx === selectedHistoryIndex
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedHistoryIndex(idx)}
                      className={`flex-1 h-2 rounded ${
                        isSelected ? 'bg-blue-600' : 'bg-gray-300'
                      } hover:bg-blue-400 transition-colors`}
                      title={obs ? formatDate(obs.captured_at || obs.created_at) : ''}
                    />
                  )
                })}
              </div>
            </div>

            {/* Display selected observation */}
            {(() => {
              const selectedObs = selectedHistoryIndex === 0 
                ? observation 
                : historyObservations[selectedHistoryIndex - 1]
              
              if (!selectedObs) return null

              return (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {selectedHistoryIndex === 0 ? 'Current Observation' : `Observation from ${getTimeAgo(selectedObs.captured_at || selectedObs.created_at)}`}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {formatDate(selectedObs.captured_at || selectedObs.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedObs.screenshot_url && (
                        <button
                          onClick={() => setFullscreenImage(selectedObs.screenshot_url!)}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Maximize2 className="h-4 w-4 mr-2" />
                          Preview
                        </button>
                      )}
                      {selectedHistoryIndex > 0 && (
                        <button
                          onClick={() => compareWithHistory(selectedObs.id)}
                          disabled={comparing || !selectedObs.screenshot_url}
                          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          <GitCompare className="h-4 w-4 mr-2" />
                          Compare with Current
                        </button>
                      )}
                    </div>
                  </div>

                  {selectedObs.screenshot_url ? (
                    <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-100 relative group">
                      <div className="max-h-[80vh] overflow-y-auto overflow-x-auto">
                        <img
                          src={selectedObs.screenshot_url}
                          alt={`Historical screenshot from ${selectedObs.region}`}
                          className="w-full h-auto min-w-full cursor-pointer"
                          loading="lazy"
                          onClick={() => setFullscreenImage(selectedObs.screenshot_url!)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-gray-200 rounded-lg p-12 text-center bg-gray-50">
                      <p className="text-gray-500">Screenshot not available</p>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}

        {/* Change Detection View */}
        {viewMode === 'diff' && comparisonData && (
          <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                  Change Detection
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Comparing current observation with previous observation
                </p>
              </div>
              {comparisonData.comparison.hasChanges && (
                <span className="inline-flex items-center px-4 py-2 bg-amber-100 text-amber-800 rounded-lg font-semibold">
                  Changes Detected
                </span>
              )}
            </div>

            {/* Change Score and Metrics */}
            <div className="mb-6 grid md:grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">Time difference:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {comparisonData.comparison.daysDiff === 0 
                        ? 'Same day' 
                        : `${comparisonData.comparison.daysDiff} day${comparisonData.comparison.daysDiff > 1 ? 's' : ''} ago`}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Change Status:</span>
                    <span className={`ml-2 font-semibold ${
                      comparisonData.comparison.hasChanges ? 'text-amber-600' : 'text-green-600'
                    }`}>
                      {comparisonData.comparison.hasChanges ? 'Visual changes detected' : 'No visual changes'}
                    </span>
                  </div>
                </div>
              </div>

              <div className={`border rounded-lg p-4 ${
                comparisonData.comparison.changeSeverity === 'high' 
                  ? 'bg-red-50 border-red-200' 
                  : comparisonData.comparison.changeSeverity === 'medium'
                  ? 'bg-amber-50 border-amber-200'
                  : comparisonData.comparison.changeSeverity === 'low'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-green-50 border-green-200'
              }`}>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">Change Score:</span>
                    <span className={`ml-2 text-2xl font-bold ${
                      comparisonData.comparison.changeSeverity === 'high' 
                        ? 'text-red-600' 
                        : comparisonData.comparison.changeSeverity === 'medium'
                        ? 'text-amber-600'
                        : comparisonData.comparison.changeSeverity === 'low'
                        ? 'text-yellow-600'
                        : 'text-green-600'
                    }`}>
                      {comparisonData.comparison.changeScore?.toFixed(2) || '0.00'}%
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Change Severity:</span>
                    <span className={`ml-2 font-semibold ${
                      comparisonData.comparison.changeSeverity === 'high' 
                        ? 'text-red-600' 
                        : comparisonData.comparison.changeSeverity === 'medium'
                        ? 'text-amber-600'
                        : comparisonData.comparison.changeSeverity === 'low'
                        ? 'text-yellow-600'
                        : 'text-green-600'
                    }`}>
                      {comparisonData.comparison.changeSeverity === 'high' 
                        ? 'High' 
                        : comparisonData.comparison.changeSeverity === 'medium'
                        ? 'Medium'
                        : comparisonData.comparison.changeSeverity === 'low'
                        ? 'Low'
                        : 'None'}
                    </span>
                  </div>
                  {comparisonData.comparison.numDiffPixels !== undefined && (
                    <div className="text-xs text-gray-500">
                      {comparisonData.comparison.numDiffPixels.toLocaleString()} of {comparisonData.comparison.totalPixels?.toLocaleString()} pixels changed
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Comparison View: Current, Previous, and Diff */}
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              {/* Current Observation */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Current</h3>
                  <span className="text-xs text-gray-500">
                    {formatDate(comparisonData.current.captured_at || comparisonData.current.created_at)}
                  </span>
                </div>
                {comparisonData.current.screenshot_url ? (
                  <div className="border-2 border-blue-300 rounded-lg overflow-hidden bg-gray-100 relative group">
                    <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
                      <img
                        src={comparisonData.current.screenshot_url}
                        alt="Current observation"
                        className="w-full h-auto min-w-full cursor-pointer"
                        loading="lazy"
                        onClick={() => setFullscreenImage(comparisonData.current.screenshot_url!)}
                      />
                    </div>
                    <button
                      onClick={() => setFullscreenImage(comparisonData.current.screenshot_url!)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 text-white p-2 rounded-lg hover:bg-opacity-70"
                    >
                      <Maximize2 className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-gray-200 rounded-lg p-12 text-center bg-gray-50">
                    <p className="text-gray-500">Not available</p>
                  </div>
                )}
              </div>

              {/* Previous Observation */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Previous</h3>
                  <span className="text-xs text-gray-500">
                    {formatDate(comparisonData.previous.captured_at || comparisonData.previous.created_at)}
                  </span>
                </div>
                {comparisonData.previous.screenshot_url ? (
                  <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100 relative group">
                    <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
                      <img
                        src={comparisonData.previous.screenshot_url}
                        alt="Previous observation"
                        className="w-full h-auto min-w-full cursor-pointer"
                        loading="lazy"
                        onClick={() => setFullscreenImage(comparisonData.previous.screenshot_url!)}
                      />
                    </div>
                    <button
                      onClick={() => setFullscreenImage(comparisonData.previous.screenshot_url!)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 text-white p-2 rounded-lg hover:bg-opacity-70"
                    >
                      <Maximize2 className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-gray-200 rounded-lg p-12 text-center bg-gray-50">
                    <p className="text-gray-500">Not available</p>
                  </div>
                )}
              </div>

              {/* Diff Image */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    Differences
                  </h3>
                </div>
                {comparisonData.comparison.diffImageUrl ? (
                  <div className="border-2 border-red-300 rounded-lg overflow-hidden bg-gray-100 relative group">
                    <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
                      <img
                        src={comparisonData.comparison.diffImageUrl}
                        alt="Difference highlights"
                        className="w-full h-auto min-w-full cursor-pointer"
                        loading="lazy"
                        onClick={() => setFullscreenImage(comparisonData.comparison.diffImageUrl!)}
                        style={{ mixBlendMode: 'multiply' }}
                      />
                    </div>
                    <button
                      onClick={() => setFullscreenImage(comparisonData.comparison.diffImageUrl!)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 text-white p-2 rounded-lg hover:bg-opacity-70"
                    >
                      <Maximize2 className="h-5 w-5" />
                    </button>
                  </div>
                ) : comparisonData.comparison.hasChanges ? (
                  <div className="border-2 border-red-300 rounded-lg p-12 text-center bg-red-50">
                    <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                    <p className="text-sm text-red-600 font-semibold">Changes detected</p>
                    <p className="text-xs text-red-500 mt-1">Diff image processing...</p>
                  </div>
                ) : (
                  <div className="border-2 border-green-300 rounded-lg p-12 text-center bg-green-50">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-green-600 font-semibold">No changes</p>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Visual Comparison Details</h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <strong>Image Dimensions:</strong> {comparisonData.comparison.imageDimensions?.width} × {comparisonData.comparison.imageDimensions?.height} pixels
                </div>
                {comparisonData.comparison.numDiffPixels !== undefined && (
                  <div>
                    <strong>Changed Pixels:</strong> {comparisonData.comparison.numDiffPixels.toLocaleString()} / {comparisonData.comparison.totalPixels?.toLocaleString()} ({comparisonData.comparison.changePercentage?.toFixed(2)}%)
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                <strong>Note:</strong> The difference image highlights changed pixels in red. 
                Change score represents the percentage of pixels that differ between the two screenshots. 
                Higher scores indicate more significant visual changes.
              </p>
            </div>

            {/* Text Comparison Section */}
            {comparingText ? (
              <div className="mt-6 p-8 bg-gray-50 rounded-lg text-center">
                <Loader className="h-8 w-8 text-blue-600 mx-auto mb-2 animate-spin" />
                <p className="text-gray-600">Analyzing text changes...</p>
              </div>
            ) : textComparisonData ? (
              <div className="mt-6 bg-white border-2 border-blue-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                    Text Content Changes
                  </h3>
                  {textComparisonData.comparison.hasChanges && (
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold ${
                      textComparisonData.comparison.changeSeverity === 'high' 
                        ? 'bg-red-100 text-red-800' 
                        : textComparisonData.comparison.changeSeverity === 'medium'
                        ? 'bg-amber-100 text-amber-800'
                        : textComparisonData.comparison.changeSeverity === 'low'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {textComparisonData.comparison.changeSeverity === 'high' 
                        ? 'Major Text Changes' 
                        : textComparisonData.comparison.changeSeverity === 'medium'
                        ? 'Moderate Text Changes'
                        : textComparisonData.comparison.changeSeverity === 'low'
                        ? 'Minor Text Changes'
                        : 'No Text Changes'}
                    </span>
                  )}
                </div>

                {/* Text Change Metrics */}
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-sm text-gray-600">Text Change Score</div>
                    <div className={`text-2xl font-bold ${
                      textComparisonData.comparison.changeSeverity === 'high' 
                        ? 'text-red-600' 
                        : textComparisonData.comparison.changeSeverity === 'medium'
                        ? 'text-amber-600'
                        : textComparisonData.comparison.changeSeverity === 'low'
                        ? 'text-yellow-600'
                        : 'text-green-600'
                    }`}>
                      {textComparisonData.comparison.changeScore?.toFixed(2) || '0.00'}%
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="text-sm text-gray-600">Words Added</div>
                    <div className="text-2xl font-bold text-green-600">
                      {textComparisonData.comparison.statistics?.addedWords || 0}
                    </div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="text-sm text-gray-600">Words Removed</div>
                    <div className="text-2xl font-bold text-red-600">
                      {textComparisonData.comparison.statistics?.removedWords || 0}
                    </div>
                  </div>
                </div>

                {/* Text Diff Display */}
                {textComparisonData.comparison.hasChanges && (
                  <div className="space-y-4">
                    {textComparisonData.comparison.removedText && (
                      <div>
                        <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                          <XCircle className="h-4 w-4" />
                          Removed Text ({textComparisonData.comparison.statistics?.removedWords || 0} words)
                        </h4>
                        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">
                            {textComparisonData.comparison.removedText}
                          </p>
                        </div>
                      </div>
                    )}
                    {textComparisonData.comparison.addedText && (
                      <div>
                        <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Added Text ({textComparisonData.comparison.statistics?.addedWords || 0} words)
                        </h4>
                        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">
                            {textComparisonData.comparison.addedText}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!textComparisonData.comparison.hasChanges && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-green-800 font-semibold">No text changes detected</p>
                    <p className="text-sm text-green-600 mt-1">
                      The text content is identical between the two observations.
                    </p>
                  </div>
                )}

                {/* Text Statistics */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <strong>Total Words:</strong> {textComparisonData.comparison.statistics?.totalWords || 0}
                    </div>
                    <div>
                      <strong>Changed Words:</strong> {textComparisonData.comparison.statistics?.changedWords || 0}
                    </div>
                    <div>
                      <strong>Change Severity:</strong> {textComparisonData.comparison.changeSeverity || 'none'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Text comparison is not available for these observations. 
                  This feature requires text content to be extracted during capture, which may not be available for older observations.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Screenshot */}
        {viewMode === 'single' ? (
          <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Screenshot - {observation.region}</h2>
              <div className="flex items-center gap-2">
                {observation.screenshot_url && (
                  <button
                    onClick={() => setFullscreenImage(observation.screenshot_url!)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    title="Preview full page screenshot"
                  >
                    <Maximize2 className="h-4 w-4 mr-2" />
                    Preview
                  </button>
                )}
                <a
                  href={observation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Original Page
                </a>
              </div>
            </div>
            {observation.screenshot_url ? (
              <>
                <div className="border-2 border-gray-200 rounded-lg overflow-hidden mb-4 bg-gray-100 relative group">
                  <div className="max-h-[80vh] overflow-y-auto overflow-x-auto">
                    <img
                      src={observation.screenshot_url}
                      alt={`Observation screenshot from ${observation.region}`}
                      className="w-full h-auto min-w-full cursor-pointer"
                      loading="lazy"
                      onClick={() => setFullscreenImage(observation.screenshot_url!)}
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
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setFullscreenImage(observation.screenshot_url!)}
                      className="bg-black bg-opacity-50 text-white p-2 rounded-lg hover:bg-opacity-70"
                      title="Preview full page screenshot"
                    >
                      <Maximize2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="mb-4">
                  <a
                    href={observation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors text-sm"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Visit {observation.url}
                  </a>
                </div>
                <Disclaimer />
              </>
            ) : (
              <>
                <div className="border-2 border-gray-200 rounded-lg p-12 text-center bg-gray-50 mb-4">
                  {observation.status === 'pending' || observation.status === 'running' ? (
                    <div>
                      <Loader className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
                      <p className="text-gray-600 font-medium mb-2">Processing observation...</p>
                      <p className="text-sm text-gray-500">
                        {observation.status === 'pending' 
                          ? 'Queued for processing' 
                          : 'Capturing screenshot and extracting content'}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        This usually takes 3-5 seconds
                      </p>
                      <button
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="mt-4 inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cancelling ? (
                          <>
                            <Loader className="h-4 w-4 mr-2 animate-spin" />
                            Cancelling...
                          </>
                        ) : (
                          <>
                            <Ban className="h-4 w-4 mr-2" />
                            Cancel Observation
                          </>
                        )}
                      </button>
                    </div>
                  ) : observation.status === 'cancelled' ? (
                    <div>
                      <Ban className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium mb-2">Observation Cancelled</p>
                      <p className="text-sm text-gray-500 mb-4">
                        This observation was cancelled and will not be processed.
                      </p>
                      <button
                        onClick={handleRetry}
                        disabled={retrying}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {retrying ? (
                          <>
                            <Loader className="h-4 w-4 mr-2 animate-spin" />
                            Retrying...
                          </>
                        ) : (
                          <>
                            <RotateCw className="h-4 w-4 mr-2" />
                            Retry Observation
                          </>
                        )}
                      </button>
                    </div>
                  ) : observation.status === 'failed' ? (
                    <div>
                      <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium mb-2">Observation Failed</p>
                      <p className="text-sm text-gray-500 mb-4">
                        This observation failed to process. You can retry it.
                      </p>
                      <button
                        onClick={handleRetry}
                        disabled={retrying}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {retrying ? (
                          <>
                            <Loader className="h-4 w-4 mr-2 animate-spin" />
                            Retrying...
                          </>
                        ) : (
                          <>
                            <RotateCw className="h-4 w-4 mr-2" />
                            Retry Observation
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-500 mb-4">Screenshot not available</p>
                      <a
                        href={observation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Original Page
                      </a>
                    </div>
                  )}
                </div>
                <Disclaimer />
              </>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Region Comparison</h2>
            <p className="text-sm text-gray-600 mb-6">
              Compare rendering results across different regions for the same URL
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Current observation */}
              <div className="border-2 border-blue-300 rounded-lg overflow-hidden bg-white">
                <div className="bg-blue-50 px-4 py-2 border-b border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-2 text-blue-600" />
                      <span className="font-semibold text-blue-900">{observation.region}</span>
                    </div>
                    {getStatusBadge(observation.status)}
                  </div>
                </div>
                {observation.screenshot_url ? (
                  <div className="border-2 border-gray-200 rounded-lg overflow-hidden m-2 bg-gray-100 relative group">
                    <div className="max-h-64 overflow-y-auto overflow-x-auto">
                      <img
                        src={observation.screenshot_url}
                        alt={`Screenshot from ${observation.region}`}
                        className="w-full h-auto min-w-full cursor-pointer"
                        loading="lazy"
                        onClick={() => setFullscreenImage(observation.screenshot_url!)}
                      />
                    </div>
                    <button
                      onClick={() => setFullscreenImage(observation.screenshot_url!)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 text-white p-1.5 rounded hover:bg-opacity-70"
                      title="Preview full page screenshot"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-gray-200 rounded-lg p-8 text-center bg-gray-50 m-2">
                    {observation.status === 'pending' || observation.status === 'running' ? (
                      <Loader className="h-8 w-8 text-blue-600 mx-auto mb-2 animate-spin" />
                    ) : (
                      <p className="text-sm text-gray-500">Not available</p>
                    )}
                  </div>
                )}
                <div className="px-4 py-2 bg-gray-50 text-xs text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>{observation.captured_at ? formatDate(observation.captured_at) : 'Pending'}</span>
                    <a
                      href={observation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 inline-flex items-center"
                      title="Open in new tab"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Related observations */}
              {relatedObservations.map((relatedObs) => (
                <div key={relatedObs.id} className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white hover:border-gray-300 transition-colors">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Globe className="h-4 w-4 mr-2 text-gray-600" />
                        <span className="font-semibold text-gray-900">{relatedObs.region}</span>
                      </div>
                      {getStatusBadge(relatedObs.status)}
                    </div>
                  </div>
                  {relatedObs.screenshot_url ? (
                    <div className="m-2 relative group">
                      <Link href={`/dashboard/observations/${relatedObs.id}`}>
                        <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:border-blue-300 transition-colors">
                          <div className="max-h-64 overflow-y-auto overflow-x-auto">
                            <img
                              src={relatedObs.screenshot_url}
                              alt={`Screenshot from ${relatedObs.region}`}
                              className="w-full h-auto min-w-full"
                              loading="lazy"
                            />
                          </div>
                        </div>
                      </Link>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setFullscreenImage(relatedObs.screenshot_url!)
                        }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 text-white p-1.5 rounded hover:bg-opacity-70 z-10"
                        title="Preview full page screenshot"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-gray-200 rounded-lg p-8 text-center bg-gray-50 m-2">
                      {relatedObs.status === 'pending' || relatedObs.status === 'running' ? (
                        <Loader className="h-8 w-8 text-blue-600 mx-auto mb-2 animate-spin" />
                      ) : (
                        <p className="text-sm text-gray-500">Not available</p>
                      )}
                    </div>
                  )}
                  <div className="px-4 py-2 bg-gray-50 text-xs text-gray-600">
                    <div className="flex items-center justify-between">
                      <span>{relatedObs.captured_at ? formatDate(relatedObs.captured_at) : 'Pending'}</span>
                      <a
                        href={relatedObs.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 inline-flex items-center"
                        title="Open in new tab"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <Disclaimer />
            </div>
          </div>
        )}

        {/* Fullscreen Preview Modal */}
        {fullscreenImage && (
          <div
            className="fixed inset-0 z-50 bg-gray-900 flex flex-col"
            onClick={() => setFullscreenImage(null)}
          >
            {/* Header */}
            <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="text-white font-semibold">Full Page Screenshot Preview</h3>
                {observation && (
                  <span className="text-gray-400 text-sm">
                    {observation.region} • {observation.url}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {observation && (
                  <a
                    href={observation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    Open Page
                  </a>
                )}
                <button
                  onClick={() => setFullscreenImage(null)}
                  className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded transition-colors"
                  title="Close (ESC)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Screenshot Container */}
            <div className="flex-1 overflow-auto bg-gray-100 flex items-start justify-center p-4">
              <div
                className="bg-white shadow-2xl rounded-lg overflow-hidden max-w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={fullscreenImage}
                  alt="Full page screenshot"
                  className="block max-w-full h-auto"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 text-center">
              <p className="text-gray-400 text-xs">
                Press ESC or click outside to close • Scroll to view full page
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}


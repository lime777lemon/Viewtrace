'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Settings, CreditCard, LogOut, Camera, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function DashboardPage() {
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState('active') // active, canceling, canceled
  const { signOut } = useAuth()
  const router = useRouter()

  const handleCancelSubscription = async () => {
    // TODO: Implement cancellation API call
    setSubscriptionStatus('canceling')
    setShowCancelModal(false)
    alert('Subscription will be canceled at the end of the current billing period.')
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Logout failed:', error)
      window.location.href = '/'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              Viewtrace
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
              <Link href="/dashboard/observations" className="text-gray-600 hover:text-gray-900">
                Observations
              </Link>
              <button 
                onClick={handleSignOut}
                className="text-gray-600 hover:text-gray-900 inline-flex items-center"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        {/* Subscription Status */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Subscription</h2>
              <p className="text-gray-600">
                Plan: <span className="font-semibold">Pro - $99/month</span>
              </p>
              {subscriptionStatus === 'canceling' && (
                <p className="text-amber-600 mt-2 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Subscription will end at the end of the current billing period.
                </p>
              )}
            </div>
            <Link
              href="/dashboard/billing"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Manage Billing
            </Link>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Camera className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Observations This Month</p>
                <p className="text-2xl font-bold text-gray-900">45 / 200</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Active Observations</p>
                <p className="text-2xl font-bold text-gray-900">12</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-amber-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Issues Detected</p>
                <p className="text-2xl font-bold text-gray-900">3</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Observations */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Observations</h2>
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">https://example.com/landing-page</p>
                  <p className="text-sm text-gray-600">US - California | Captured: 2024-01-15 14:30</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                    No visible issues detected at capture time
                  </span>
                </div>
              </div>
            </div>
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">https://example.com/promo</p>
                  <p className="text-sm text-gray-600">US - New York | Captured: 2024-01-15 12:15</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold">
                    Difference observed
                  </span>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">https://example.com/campaign</p>
                  <p className="text-sm text-gray-600">US - Texas | Captured: 2024-01-14 18:45</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                    Observed
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



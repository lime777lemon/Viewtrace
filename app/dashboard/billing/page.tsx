'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, Check } from 'lucide-react'

export default function BillingPage() {
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState('active')

  const handleCancelSubscription = async () => {
    // TODO: Implement cancellation API call
    setSubscriptionStatus('canceling')
    setShowCancelModal(false)
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
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Billing</h1>

        {/* Current Plan */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Plan</h2>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-lg font-semibold text-gray-900">Pro Plan</p>
              <p className="text-gray-600">$99 / month</p>
              {subscriptionStatus === 'canceling' && (
                <p className="text-amber-600 mt-2 flex items-center text-sm">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Subscription will end at the end of the current billing period.
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Next billing date</p>
              <p className="font-semibold text-gray-900">February 15, 2024</p>
            </div>
          </div>
          <ul className="space-y-2 mb-6">
            <li className="flex items-center text-gray-700">
              <Check className="h-5 w-5 text-green-500 mr-2" />
              200 observations / month
            </li>
            <li className="flex items-center text-gray-700">
              <Check className="h-5 w-5 text-green-500 mr-2" />
              US all states
            </li>
            <li className="flex items-center text-gray-700">
              <Check className="h-5 w-5 text-green-500 mr-2" />
              History & comparison
            </li>
            <li className="flex items-center text-gray-700">
              <Check className="h-5 w-5 text-green-500 mr-2" />
              CSV export
            </li>
          </ul>
          {subscriptionStatus === 'active' && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="text-red-600 hover:text-red-700 font-semibold"
            >
              Cancel Subscription
            </button>
          )}
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Method</h2>
          <p className="text-gray-600 mb-4">Manage your payment method in Stripe</p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Update Payment Method
          </button>
        </div>

        {/* Billing History */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Billing History</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div>
                <p className="font-semibold text-gray-900">January 15, 2024</p>
                <p className="text-sm text-gray-600">Pro Plan - Monthly</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">$99.00</p>
                <p className="text-sm text-green-600">Paid</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">December 15, 2023</p>
                <p className="text-sm text-gray-600">Pro Plan - Monthly</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">$99.00</p>
                <p className="text-sm text-green-600">Paid</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Cancel Subscription</h3>
            <p className="text-gray-600 mb-2">
              Canceling will stop future billing.
            </p>
            <p className="text-gray-600 mb-6">
              Access remains active until the end of the current billing period.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:border-gray-400"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Cancel Subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



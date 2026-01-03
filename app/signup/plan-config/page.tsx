'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, Plus, Minus, Info } from 'lucide-react'

interface PlanConfig {
  basePrice: number // $49/month base
  observations: number // Checks per month
  retentionDays: number // Data retention in days
  notificationUsers: number // Number of notification users (future feature)
}

const BASE_PRICE = 49
const OBSERVATION_PACKAGES = [
  { count: 50, price: 0 },
  { count: 100, price: 20 },
  { count: 200, price: 40 },
  { count: 500, price: 80 },
  { count: 1000, price: 150 },
]

const RETENTION_OPTIONS = [
  { days: 7, price: 0, label: '7 days' },
  { days: 30, price: 10, label: '30 days' },
  { days: 90, price: 25, label: '90 days' },
  { days: 365, price: 60, label: '1 year' },
]

const NOTIFICATION_USERS = [
  { count: 1, price: 0 },
  { count: 3, price: 5 },
  { count: 5, price: 8 },
  { count: 10, price: 15 },
]

export default function PlanConfigPage() {
  const router = useRouter()
  const [config, setConfig] = useState<PlanConfig>({
    basePrice: BASE_PRICE,
    observations: 50,
    retentionDays: 7,
    notificationUsers: 1,
  })
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')

  const calculateTotal = () => {
    const observationPackage = OBSERVATION_PACKAGES.find(p => p.count === config.observations) || OBSERVATION_PACKAGES[0]
    const retentionOption = RETENTION_OPTIONS.find(r => r.days === config.retentionDays) || RETENTION_OPTIONS[0]
    const notificationPackage = NOTIFICATION_USERS.find(n => n.count === config.notificationUsers) || NOTIFICATION_USERS[0]
    
    const monthlyTotal = BASE_PRICE + observationPackage.price + retentionOption.price + notificationPackage.price
    return billing === 'annual' ? Math.round(monthlyTotal * 10) : monthlyTotal // 2 months free for annual
  }

  const handleContinue = () => {
    // Store config in sessionStorage or pass as query params
    const configString = JSON.stringify(config)
    router.push(`/signup?plan=custom&billing=${billing}&config=${encodeURIComponent(configString)}`)
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
            <Link href="/login" className="text-gray-600 hover:text-gray-900">
              Login
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Configure Your Plan</h1>
          <p className="text-gray-600 mb-8">
            Start with $49/month base and customize based on your needs
          </p>

          {/* Billing Period */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Billing Period
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setBilling('monthly')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                  billing === 'monthly'
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">Monthly</div>
                <div className="text-sm text-gray-600">Pay monthly</div>
              </button>
              <button
                onClick={() => setBilling('annual')}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                  billing === 'annual'
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">Annual</div>
                <div className="text-sm text-gray-600">Save 2 months (17% off)</div>
              </button>
            </div>
          </div>

          {/* Observations (Checks) */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Observations per month
              </label>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Info className="h-4 w-4" />
                <span>Number of checks you can run</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {OBSERVATION_PACKAGES.map((pkg) => (
                <button
                  key={pkg.count}
                  onClick={() => setConfig({ ...config, observations: pkg.count })}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors text-left ${
                    config.observations === pkg.count
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">{pkg.count.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">
                    {pkg.price === 0 ? 'Included' : `+$${pkg.price}/mo`}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Data Retention */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Screenshot Retention
              </label>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Info className="h-4 w-4" />
                <span>How long to keep screenshots</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {RETENTION_OPTIONS.map((option) => (
                <button
                  key={option.days}
                  onClick={() => setConfig({ ...config, retentionDays: option.days })}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                    config.retentionDays === option.days
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">{option.label}</div>
                  <div className="text-sm text-gray-600">
                    {option.price === 0 ? 'Included' : `+$${option.price}/mo`}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Notification Users (Future feature) */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Notification Users
                <span className="ml-2 text-xs text-gray-500">(Coming soon)</span>
              </label>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Info className="h-4 w-4" />
                <span>Users who receive alerts</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {NOTIFICATION_USERS.map((pkg) => (
                <button
                  key={pkg.count}
                  onClick={() => setConfig({ ...config, notificationUsers: pkg.count })}
                  disabled={true}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                    config.notificationUsers === pkg.count
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <div className="font-semibold">{pkg.count} user{pkg.count > 1 ? 's' : ''}</div>
                  <div className="text-sm text-gray-600">
                    {pkg.price === 0 ? 'Included' : `+$${pkg.price}/mo`}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Price Summary */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Summary</h3>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-gray-700">
                <span>Base Plan</span>
                <span>${BASE_PRICE}/mo</span>
              </div>
              {OBSERVATION_PACKAGES.find(p => p.count === config.observations)?.price! > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>{config.observations.toLocaleString()} Observations</span>
                  <span>+${OBSERVATION_PACKAGES.find(p => p.count === config.observations)?.price}/mo</span>
                </div>
              )}
              {RETENTION_OPTIONS.find(r => r.days === config.retentionDays)?.price! > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>{RETENTION_OPTIONS.find(r => r.days === config.retentionDays)?.label} Retention</span>
                  <span>+${RETENTION_OPTIONS.find(r => r.days === config.retentionDays)?.price}/mo</span>
                </div>
              )}
              {NOTIFICATION_USERS.find(n => n.count === config.notificationUsers)?.price! > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>{config.notificationUsers} Notification Users</span>
                  <span>+${NOTIFICATION_USERS.find(n => n.count === config.notificationUsers)?.price}/mo</span>
                </div>
              )}
            </div>
            <div className="border-t border-gray-300 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">
                  {billing === 'annual' ? 'Annual Total' : 'Monthly Total'}
                </span>
                <span className="text-3xl font-bold text-blue-600">
                  ${calculateTotal()}
                  <span className="text-lg text-gray-600">/{billing === 'annual' ? 'year' : 'mo'}</span>
                </span>
              </div>
              {billing === 'annual' && (
                <p className="text-sm text-gray-600 mt-2">
                  ${Math.round(calculateTotal() / 12)}/month (billed annually, save ${(BASE_PRICE * 2)})
                </p>
              )}
            </div>
          </div>

          {/* Continue Button */}
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900"
            >
              Cancel
            </Link>
            <button
              onClick={handleContinue}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Continue to Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


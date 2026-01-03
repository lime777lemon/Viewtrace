'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { Check, Eye, EyeOff, AlertCircle } from 'lucide-react'

interface FormErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
  terms?: string
}

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const plan = searchParams.get('plan') || 'starter'
  const [agreed, setAgreed] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [errors, setErrors] = useState<FormErrors>({})
  const [isDevMode, setIsDevMode] = useState(false)

  useEffect(() => {
    // Check if we're in development mode
    setIsDevMode(
      process.env.NEXT_PUBLIC_DEV_MODE === 'true' ||
      process.env.NODE_ENV === 'development' ||
      window.location.hostname === 'localhost'
    )
  }, [])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!name.trim()) {
      newErrors.name = 'Name is required'
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number'
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (!agreed) {
      newErrors.terms = 'You must agree to the Terms of Service'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      // Import Supabase client dynamically
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      // Sign up user with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            name: name,
            plan: plan,
            billing: billing,
          },
        },
      })

      if (error) {
        // Check if user already exists
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          setErrors({ 
            email: 'This email is already registered. Please sign in instead.' 
          })
          // Redirect to login after 2 seconds
          setTimeout(() => {
            router.push('/login')
          }, 2000)
          setLoading(false)
          return
        }
        
        setErrors({ email: error.message })
        setLoading(false)
        return
      }

      if (data.user) {
        // Wait a bit for auth.users to be committed
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Create user profile via API route (bypasses RLS)
        let profileCreated = false
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const profileResponse = await fetch('/api/users/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: data.user.id,
                email: data.user.email || email,
                name: name,
                plan: plan,
                billingPeriod: billing,
              }),
            })
            
            const profileResult = await profileResponse.json()
            if (profileResponse.ok || profileResult.warning) {
              profileCreated = true
              console.log('User profile created/updated successfully:', profileResult)
              break
            } else {
              console.warn(`Profile creation attempt ${attempt + 1} failed:`, profileResult)
              if (attempt < 2) {
                await new Promise(resolve => setTimeout(resolve, 500))
              }
            }
          } catch (e) {
            console.warn(`Profile creation attempt ${attempt + 1} error:`, e)
            if (attempt < 2) {
              await new Promise(resolve => setTimeout(resolve, 500))
            }
          }
        }
        
        if (!profileCreated && isDevMode) {
          console.warn('Profile creation failed, but continuing in dev mode')
        } else if (!profileCreated) {
          setErrors({ 
            email: 'Account created but profile setup failed. Please try logging in.' 
          })
          setTimeout(() => {
            router.push('/login')
          }, 2000)
          setLoading(false)
          return
        }

        // Development mode: skip Stripe Checkout and go directly to observations page
        if (isDevMode) {
          // Redirect directly to observation creation page for testing
          router.push('/dashboard/observations/new')
        } else {
          // Production: Redirect to Stripe Checkout with userId in metadata
          window.location.href = `/api/checkout?plan=${plan}&email=${encodeURIComponent(email)}&billing=${billing}&name=${encodeURIComponent(name)}&userId=${data.user.id}`
        }
      }
    } catch (error: any) {
      console.error('Signup error:', error)
      setErrors({ email: error.message || 'An error occurred during signup' })
      setLoading(false)
    }
  }

  const plans = {
    starter: {
      name: 'Starter',
      price: 49,
      observations: 50,
      features: ['US + major countries', 'Screenshot retention: 7 days']
    },
    pro: {
      name: 'Pro',
      price: 99,
      observations: 200,
      features: ['US all states', 'History & comparison', 'CSV export']
    }
  }

  const selectedPlan = plans[plan as keyof typeof plans] || plans.starter

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <Link href="/" className="text-2xl font-bold text-gray-900 block text-center mb-2">
            Viewtrace
          </Link>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Start Your Free Trial
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Selected Plan: <span className="font-semibold">{selectedPlan.name}</span>
          </p>
        </div>
        
        {/* Billing Period Selection */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-3">Billing Period</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              className={`px-4 py-3 rounded-lg border-2 text-center ${
                billing === 'monthly'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold">Monthly</div>
              <div className="text-sm">${selectedPlan.price}/month</div>
            </button>
            <button
              type="button"
              onClick={() => setBilling('annual')}
              className={`px-4 py-3 rounded-lg border-2 text-center ${
                billing === 'annual'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold">Annual</div>
              <div className="text-sm">
                ${Math.round(selectedPlan.price * 10)}/year
                <span className="block text-xs text-green-600">Save 2 months</span>
              </div>
            </button>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (errors.name) setErrors({ ...errors, name: undefined })
                }}
                className={`appearance-none rounded-md relative block w-full px-3 py-3 border ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="John Doe"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors({ ...errors, email: undefined })
                }}
                className={`appearance-none rounded-md relative block w-full px-3 py-3 border ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errors.password) setErrors({ ...errors, password: undefined })
                  }}
                  className={`appearance-none rounded-md relative block w-full px-3 py-3 pr-10 border ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.password}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Must contain uppercase, lowercase, and number
              </p>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined })
                  }}
                  className={`appearance-none rounded-md relative block w-full px-3 py-3 pr-10 border ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                checked={agreed}
                onChange={(e) => {
                  setAgreed(e.target.checked)
                  if (errors.terms) setErrors({ ...errors, terms: undefined })
                }}
                className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                  errors.terms ? 'border-red-300' : ''
                }`}
                required
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="terms" className="text-gray-700">
                I agree to the{' '}
                <Link href="/terms" className="text-blue-600 hover:text-blue-500 underline" target="_blank">
                  Terms of Service
                </Link>
                {' '}and acknowledge that results are observational only.
              </label>
              {errors.terms && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.terms}
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !agreed}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Continue to Payment'}
            </button>
          </div>

          <div className="text-center">
            <Link href="/login" className="text-sm text-blue-600 hover:text-blue-500">
              Already have an account? Sign in
            </Link>
          </div>
        </form>

        <div className="mt-8 bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Details</h3>
          <div className="space-y-2">
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-gray-700">{selectedPlan.observations} observations / month</span>
            </div>
            {selectedPlan.features.map((feature, idx) => (
              <div key={idx} className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { isDevMode, bypassAuthCheck } from '@/lib/dev-bypass'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devMode, setDevMode] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setDevMode(isDevMode())
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      console.log('Attempting login for:', email)
      // First try normal login
      let { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      console.log('Login attempt result:', {
        hasData: !!data,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        error: signInError?.message,
        errorCode: signInError?.status,
      })

      // Development mode: if login fails, try to sign up automatically
      if (devMode && bypassAuthCheck() && signInError) {
        console.log('Dev mode: Login failed, attempting auto signup...')
        console.log('Error details:', {
          message: signInError.message,
          status: signInError.status,
        })
        
        // First, check if it's an email confirmation issue
        if (signInError.message.includes('Invalid login credentials')) {
          console.log('Invalid credentials - user might exist but email not confirmed')
          console.log('Please run this SQL in Supabase:')
          console.log(`UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = '${email}';`)
        }
        
        // Try to sign up (will succeed if user doesn't exist, or fail if exists)
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            // Disable email confirmation in dev mode
            data: {
              skip_email_confirm: true,
            },
          },
        })

        console.log('SignUp result:', {
          hasUser: !!signUpData?.user,
          hasSession: !!signUpData?.session,
          error: signUpError?.message,
        })

        if (signUpData?.user) {
          // Wait a bit for auth.users to be committed
          console.log('Waiting for auth.users to be committed...')
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Create profile via API (with retry)
          let profileCreated = false
          for (let i = 0; i < 3; i++) {
            try {
              const profileResponse = await fetch('/api/users/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: signUpData.user.id,
                  email: signUpData.user.email,
                  name: email.split('@')[0],
                  plan: 'pro',
                  billingPeriod: 'monthly',
                }),
              })
              
              const profileResult = await profileResponse.json()
              if (profileResponse.ok || profileResult.warning) {
                profileCreated = true
                console.log('Profile creation result:', profileResult)
                break
              } else {
                console.warn(`Profile creation attempt ${i + 1} failed:`, profileResult)
                await new Promise(resolve => setTimeout(resolve, 500))
              }
            } catch (e) {
              console.warn(`Profile creation attempt ${i + 1} error:`, e)
              await new Promise(resolve => setTimeout(resolve, 500))
            }
          }
          
          // Only set data if we have a session (Supabase type requirement)
          if (signUpData.session) {
            data = { user: signUpData.user, session: signUpData.session }
            signInError = null
            console.log('Using signUp session for login')
          } else {
            // If no session, wait and try to sign in again to get a session
            console.log('No session from signUp, waiting and retrying sign in...')
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            const retrySignIn = await supabase.auth.signInWithPassword({ email, password })
            console.log('Retry signIn result:', {
              hasData: !!retrySignIn.data,
              hasUser: !!retrySignIn.data?.user,
              hasSession: !!retrySignIn.data?.session,
              error: retrySignIn.error?.message,
            })
            
            if (retrySignIn.data && retrySignIn.data.session) {
              data = retrySignIn.data
              signInError = null
              console.log('Retry signIn successful')
            } else {
              console.error('Retry signIn also failed')
            }
          }
        } else if (signUpError?.message.includes('already registered')) {
          // User exists but login failed - might be email confirmation issue
          console.log('User already exists, checking email confirmation status...')
          
          // Try login multiple times with delays
          for (let i = 0; i < 3; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            const retry = await supabase.auth.signInWithPassword({
              email,
              password,
            })
            
            console.log(`Retry login attempt ${i + 1}:`, {
              hasData: !!retry.data,
              hasSession: !!retry.data?.session,
              error: retry.error?.message,
            })
            
            if (!retry.error && retry.data?.session) {
              data = retry.data
              signInError = null
              console.log('Retry login successful')
              break
            }
          }
          
          if (signInError) {
            // If still failing, show helpful message
            setError('User exists but login failed. This might be due to email confirmation. Please run this SQL in Supabase: UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL;')
            setLoading(false)
            return
          }
        }
      }

      if (signInError) {
        // Provide more helpful error messages
        let errorMessage = signInError.message
        let showDetailedHelp = false
        
        console.error('Login error details:', {
          message: signInError.message,
          status: signInError.status,
          statusCode: (signInError as any).statusCode,
          name: signInError.name,
          fullError: signInError,
        })
        
        if (signInError.message.includes('captcha') || signInError.message.toLowerCase().includes('captcha')) {
          errorMessage = 'CAPTCHA verification failed. Please disable CAPTCHA in Supabase Dashboard > Authentication > Settings for development, or try again.'
          if (devMode) {
            errorMessage += '\n\n💡 Dev mode: Go to Supabase Dashboard > Authentication > Settings > Bot Protection and disable CAPTCHA'
            showDetailedHelp = true
          }
        } else if (signInError.message.includes('Invalid login credentials') || signInError.status === 400) {
          errorMessage = 'Invalid email or password. Please check your credentials or sign up if you don\'t have an account.'
          
          // In dev mode, provide additional help
          if (devMode) {
            errorMessage += '\n\n💡 Dev mode troubleshooting (most likely causes):'
            errorMessage += '\n\n1. Email confirmation is enabled (most common):'
            errorMessage += '\n   → Go to: https://supabase.com/dashboard/project/lywcdvevizwopochcpic/auth/settings'
            errorMessage += '\n   → Scroll to "Email Auth" section'
            errorMessage += '\n   → Turn OFF "Enable email confirmations"'
            errorMessage += '\n   → Click "Save"'
            errorMessage += '\n\n2. Or run this SQL in Supabase SQL Editor:'
            errorMessage += `\n   UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = '${email}';`
            errorMessage += '\n\n3. CAPTCHA is enabled:'
            errorMessage += '\n   → Same page, scroll to "Bot Protection" section'
            errorMessage += '\n   → Turn OFF "Enable CAPTCHA protection"'
            errorMessage += '\n   → Click "Save"'
            errorMessage += '\n\n4. Check if user exists in Supabase:'
            errorMessage += '\n   → Go to: Authentication > Users'
            errorMessage += `\n   → Search for: ${email}`
            showDetailedHelp = true
          }
        } else if (signInError.message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and confirm your account before logging in.'
          if (devMode) {
            errorMessage += '\n\n💡 Dev mode: Run this SQL in Supabase SQL Editor:'
            errorMessage += `\nUPDATE auth.users SET email_confirmed_at = NOW() WHERE email = '${email}';`
            showDetailedHelp = true
          }
        }
        
        setError(errorMessage)
        setLoading(false)
        return
      }

      if (data?.user) {
        console.log('Login successful, user:', data.user.id)
        
        // Ensure user profile exists (especially in dev mode) - use API route to bypass RLS
        // Retry multiple times to handle timing issues
        if (devMode) {
          let profileCreated = false
          for (let attempt = 0; attempt < 5; attempt++) {
            try {
              console.log(`Dev mode: Ensuring user profile exists (attempt ${attempt + 1}/5)...`)
              
              // Wait a bit before each attempt (except first)
              if (attempt > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000))
              }
              
              const profileResponse = await fetch('/api/users/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: data.user.id,
                  email: data.user.email || email,
                  name: email.split('@')[0],
                  plan: 'pro',
                  billingPeriod: 'monthly',
                }),
              })
              
              const profileResult = await profileResponse.json()
              if (profileResponse.ok || profileResult.warning) {
                profileCreated = true
                console.log('Dev mode: Profile ensured:', profileResult)
                break
              } else {
                console.warn(`Dev mode: Profile creation attempt ${attempt + 1} failed:`, profileResult)
              }
            } catch (e) {
              console.warn(`Dev mode: Profile creation attempt ${attempt + 1} error:`, e)
            }
          }
          
          if (!profileCreated) {
            console.warn('Dev mode: Profile creation failed after all attempts, but continuing anyway')
          }
        }

        // Wait a moment for session to be established
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Verify session before redirect
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        console.log('Current session after login:', currentSession ? 'exists' : 'missing')
        
        if (currentSession) {
          router.push('/dashboard')
          router.refresh()
        } else {
          console.error('Session not established after login')
          setError('Session not established. Please try again.')
          setLoading(false)
        }
      } else {
        console.error('Login failed: No user data returned')
        if (!signInError) {
          setError('Login failed. Please check your credentials and try again.')
          setLoading(false)
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <Link href="/" className="text-2xl font-bold text-gray-900 block text-center mb-2">
            Viewtrace
          </Link>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="whitespace-pre-line">{error}</div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
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
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-md relative block w-full px-3 py-3 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <Link href="/signup" className="text-sm text-blue-600 hover:text-blue-500">
              Don't have an account? Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}



import { useState, useMemo, type ReactNode } from 'react'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import {
  convexClient,
  isConvexConfigured,
  DEFAULT_MAINTENANCE_MESSAGE,
  MockAuthContext,
  type MockAuthContextType,
} from './convex-bridge.ts'

export function AppAuthProvider({ children }: { children: ReactNode }) {
  if (isConvexConfigured && convexClient) {
    return <ConvexAuthProvider client={convexClient}>{children}</ConvexAuthProvider>
  }

  return <MockConvexProvider>{children}</MockConvexProvider>
}

function MockConvexProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('osinct_mock_auth') === 'true'
  })
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return sessionStorage.getItem('osinct_mock_email') || null
  })
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; message: string }>(() => {
    const saved = sessionStorage.getItem('osinct_mock_maintenance')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        // fallback to default
      }
    }
    return { enabled: false, message: DEFAULT_MAINTENANCE_MESSAGE }
  })

  const contextValue = useMemo<MockAuthContextType>(() => {
    return {
      isAuthenticated,
      userEmail,
      maintenance,
      async signIn(_provider: string, formData: FormData) {
        const email = String(formData.get('email') || '').trim()
        const password = String(formData.get('password') || '')
        if (!email || !email.includes('@')) {
          throw new Error('Please enter a valid email address.')
        }
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters.')
        }
        setIsAuthenticated(true)
        setUserEmail(email)
        sessionStorage.setItem('osinct_mock_auth', 'true')
        sessionStorage.setItem('osinct_mock_email', email)
      },
      async signOut() {
        setIsAuthenticated(false)
        setUserEmail(null)
        sessionStorage.removeItem('osinct_mock_auth')
        sessionStorage.removeItem('osinct_mock_email')
      },
      async updateMaintenance(args: { enabled: boolean; message: string }) {
        const message = args.message.trim()
        if (message.length < 5 || message.length > 500) {
          throw new Error('The maintenance message must be between 5 and 500 characters.')
        }
        const updated = { enabled: args.enabled, message }
        setMaintenance(updated)
        sessionStorage.setItem('osinct_mock_maintenance', JSON.stringify(updated))
        return updated
      },
      async enableByCode(args: { code: string }) {
        if (args.code.trim() !== '192008') {
          throw new Error('Invalid maintenance code.')
        }
        const updated = { enabled: true, message: DEFAULT_MAINTENANCE_MESSAGE }
        setMaintenance(updated)
        sessionStorage.setItem('osinct_mock_maintenance', JSON.stringify(updated))
        return updated
      },
    }
  }, [isAuthenticated, userEmail, maintenance])

  return <MockAuthContext.Provider value={contextValue}>{children}</MockAuthContext.Provider>
}

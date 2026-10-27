import { createContext, useContext } from 'react'
import { useAuthActions as convexUseAuthActions } from '@convex-dev/auth/react'
import {
  ConvexReactClient,
  useConvexAuth as convexUseConvexAuth,
  useMutation as convexUseMutation,
  useQuery as convexUseQuery,
} from 'convex/react'
import type { FunctionReference } from 'convex/server'

export const DEFAULT_MAINTENANCE_MESSAGE = 'The website is currently under maintenance. Please wait for service to resume.'

const rawConvexUrl = typeof import.meta.env.VITE_CONVEX_URL === 'string' ? import.meta.env.VITE_CONVEX_URL.trim() : ''
export const isConvexConfigured = Boolean(
  rawConvexUrl && (rawConvexUrl.startsWith('http://') || rawConvexUrl.startsWith('https://')),
)

let client: ConvexReactClient | null = null
if (isConvexConfigured) {
  try {
    client = new ConvexReactClient(rawConvexUrl)
  } catch (err) {
    console.warn('[Osinct] Failed to initialize Convex client with URL:', rawConvexUrl, err)
  }
}

export const convexClient = client

export interface MockAuthContextType {
  isAuthenticated: boolean
  userEmail: string | null
  maintenance: { enabled: boolean; message: string }
  signIn: (provider: string, formData: FormData) => Promise<void>
  signOut: () => Promise<void>
  updateMaintenance: (args: { enabled: boolean; message: string }) => Promise<{ enabled: boolean; message: string }>
  enableByCode: (args: { code: string }) => Promise<{ enabled: boolean; message: string }>
}

export const MockAuthContext = createContext<MockAuthContextType | null>(null)

function useMockConvexAuth() {
  const ctx = useContext(MockAuthContext)
  return {
    isLoading: false,
    isAuthenticated: ctx ? ctx.isAuthenticated : false,
  }
}

function useMockAuthActions() {
  const ctx = useContext(MockAuthContext)
  return {
    signIn: ctx ? ctx.signIn : async () => {},
    signOut: ctx ? ctx.signOut : async () => {},
  }
}

function useMockQuery<Query extends FunctionReference<'query'>>(
  query: Query,
  _args?: Record<string, unknown>,
): any {
  const ctx = useContext(MockAuthContext)
  const queryName = (query as any)?._functionName || ''

  if (queryName.includes('getAdminStatus') || String(query).includes('getAdminStatus')) {
    return {
      isAdmin: true,
      adminConfigured: true,
      userId: ctx?.userEmail ?? 'mock-admin-user',
    }
  }

  if (queryName.includes('getStatus') || String(query).includes('getStatus')) {
    return ctx?.maintenance ?? { enabled: false, message: DEFAULT_MAINTENANCE_MESSAGE }
  }

  return undefined
}

function useMockMutation<Mutation extends FunctionReference<'mutation'>>(
  mutation: Mutation,
): any {
  const ctx = useContext(MockAuthContext)
  const mutationName = (mutation as any)?._functionName || ''

  if (mutationName.includes('enableByCode') || String(mutation).includes('enableByCode')) {
    return async (args: { code: string }) => {
      if (!ctx) throw new Error('Auth context unavailable')
      return ctx.enableByCode(args)
    }
  }

  if (mutationName.includes('updateStatus') || String(mutation).includes('updateStatus')) {
    return async (args: { enabled: boolean; message: string }) => {
      if (!ctx) throw new Error('Auth context unavailable')
      return ctx.updateMaintenance(args)
    }
  }

  return async () => {}
}

export const useConvexAuth = isConvexConfigured && convexClient
  ? convexUseConvexAuth
  : useMockConvexAuth

export const useAuthActions = isConvexConfigured && convexClient
  ? convexUseAuthActions
  : useMockAuthActions

export const useQuery: typeof convexUseQuery = isConvexConfigured && convexClient
  ? convexUseQuery
  : (useMockQuery as unknown as typeof convexUseQuery)

export const useMutation: typeof convexUseMutation = isConvexConfigured && convexClient
  ? convexUseMutation
  : (useMockMutation as unknown as typeof convexUseMutation)

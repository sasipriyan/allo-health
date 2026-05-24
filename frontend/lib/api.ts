import { createClient } from "@/lib/supabase/client"

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

async function authHeaders(extra?: Record<string, string>): Promise<HeadersInit> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return {
    "Content-Type": "application/json",
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    ...extra,
  }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const extraHeaders = init.headers as Record<string, string> | undefined
  const headers = await authHeaders(extraHeaders)
  return fetch(`${BACKEND}${path}`, { ...init, headers })
}

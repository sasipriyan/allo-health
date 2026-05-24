import { Request, Response, NextFunction } from "express"
import { supabase } from "../lib/supabase"
import { syncReservationUserProfile } from "../lib/reservations"

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string | undefined
    name?: string | null
  }
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" })
    return
  }

  const token = authHeader.slice(7)

  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    res.status(401).json({ error: "Invalid or expired token" })
    return
  }

  const metadataName =
    typeof data.user.user_metadata?.["name"] === "string"
      ? data.user.user_metadata["name"]
      : typeof data.user.user_metadata?.["full_name"] === "string"
        ? data.user.user_metadata["full_name"]
        : null

  req.user = {
    id: data.user.id,
    email: data.user.email,
    name: metadataName,
  }

  void syncReservationUserProfile(req.user).catch((err) => {
    console.error("[auth profile sync]", err)
  })

  next()
}

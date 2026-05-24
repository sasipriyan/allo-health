"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function login(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/", "layout")
  redirect("/products")
}

export async function register(formData: FormData) {
  const supabase = await createClient()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

  const { data, error } = await supabase.auth.signUp({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      data: { full_name: formData.get("name") as string },
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // session is null when email confirmation is required
  if (!data.session) {
    return { confirmEmail: true }
  }

  revalidatePath("/", "layout")
  redirect("/products")
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}

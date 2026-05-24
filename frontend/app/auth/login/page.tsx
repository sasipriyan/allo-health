"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, LockKeyhole, Mail, PackageCheck, ShieldCheck, Sparkles } from "lucide-react"
import { login } from "@/app/auth/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import styles from "@/styles/Auth.module.css"

export default function LoginPage() {
  const searchParams = useSearchParams()
  const urlError = searchParams.get("error")
  const [error, setError] = useState<string | null>(urlError)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError(null)
    setLoading(true)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.loginGrid}>
        <section className={styles.hero}>
          <img
            src="https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=1600&h=1200&fit=crop&auto=format&q=85"
            alt="Healthcare inventory shelves"
            className={styles.heroImage}
          />
          <div className={styles.heroOverlayLogin} />
          <div className={styles.heroGlow} />

          <div className={styles.heroContent}>
            <Brand />

            <div className={styles.heroCopy}>
              <div className={styles.pill}>
                <Sparkles size={14} />
                Live stock, held only at checkout
              </div>
              <h1 className={styles.heroTitle}>Sign in and continue your private health order.</h1>
              <div className={styles.heroCards}>
                {["Warehouse stock", "Secure checkout", "Order history"].map((item) => (
                  <div key={item} className={styles.heroCard}>
                    <ShieldCheck size={16} color="#54d6b6" />
                    <p className={styles.heroCardText}>{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className={styles.heroFoot}>Built for reservation-safe checkout demos.</p>
          </div>
        </section>

        <section className={styles.formSide}>
          <div className={styles.formWrap}>
            <div className={styles.mobileBrand}>
              <div className={styles.mobileMark}>
                <PackageCheck size={20} />
              </div>
              <p className={styles.eyebrow}>Allo Health</p>
            </div>

            <div className={styles.formCard}>
              <div>
                <p className={styles.eyebrow}>Welcome back</p>
                <h2 className={styles.title}>Sign in</h2>
                <p className={styles.subtitle}>Use your account to view products, cart, billing, and orders.</p>
              </div>

              <form action={handleSubmit} className={styles.formContent}>
                <div className={styles.field}>
                  <Label htmlFor="email">Email address</Label>
                  <div className={styles.inputWrap}>
                    <Mail className={styles.fieldIcon} size={16} />
                    <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" className={styles.inputWithLeftIcon} />
                  </div>
                </div>

                <PasswordInput
                  id="password"
                  name="password"
                  label="Password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  show={showPassword}
                  setShow={setShowPassword}
                />

                {error && <div className={styles.error}>{error}</div>}

                <Button type="submit" className={styles.submit} disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>

              <div className={styles.switchBox}>
                New here?{" "}
                <Link href="/auth/register" className={styles.switchLink}>
                  Create an account
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function Brand() {
  return (
    <div className={styles.brand}>
      <div className={styles.brandMark}>
        <PackageCheck size={20} />
      </div>
      <div>
        <p className={styles.brandName}>Allo Health</p>
        <p className={styles.brandSub}>Inventory checkout</p>
      </div>
    </div>
  )
}

function PasswordInput({
  id,
  name,
  label,
  placeholder,
  autoComplete,
  show,
  setShow,
}: {
  id: string
  name: string
  label: string
  placeholder: string
  autoComplete: string
  show: boolean
  setShow: (value: boolean) => void
}) {
  return (
    <div className={styles.field}>
      <Label htmlFor={id}>{label}</Label>
      <div className={styles.inputWrap}>
        <LockKeyhole className={styles.fieldIcon} size={16} />
        <Input id={id} name={name} type={show ? "text" : "password"} placeholder={placeholder} required autoComplete={autoComplete} className={styles.passwordInput} />
        <button type="button" onClick={() => setShow(!show)} className={styles.eyeButton} aria-label={show ? "Hide password" : "Show password"}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}

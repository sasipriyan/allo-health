"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { Eye, EyeOff, LockKeyhole, Mail, PackageCheck, ShieldCheck, Sparkles, UserRound } from "lucide-react"
import { register } from "@/app/auth/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import styles from "@/styles/Auth.module.css"

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState(false)

  async function handleSubmit(formData: FormData) {
    const password = formData.get("password") as string
    const confirm = formData.get("confirmPassword") as string

    if (password !== confirm) {
      setError("Passwords do not match")
      return
    }

    setError(null)
    setLoading(true)
    const result = await register(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else if (result?.confirmEmail) {
      setConfirmEmail(true)
    }
  }

  if (confirmEmail) {
    return (
      <main className={styles.page}>
        <div className={styles.registerGrid}>
          <section className={styles.formSide}>
            <div className={styles.formWrap}>
              <div className={styles.formCard}>
                <p className={styles.eyebrow}>Allo Health</p>
                <h1 className={styles.title}>Check your email</h1>
                <p className={styles.subtitle}>
                  We sent a confirmation link to your inbox. Click it to activate your account and sign in.
                </p>
                <div className={styles.switchBox} style={{ marginTop: "1.5rem" }}>
                  Already confirmed?{" "}
                  <Link href="/auth/login" className={styles.switchLink}>
                    Sign in
                  </Link>
                </div>
              </div>
            </div>
          </section>
          <section className={styles.hero}>
            <img
              src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1600&h=1200&fit=crop&auto=format&q=85"
              alt="Digital healthcare workspace"
              className={styles.heroImage}
            />
            <div className={styles.heroOverlayRegister} />
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <div className={styles.registerGrid}>
        <section className={styles.formSide}>
          <div className={styles.formWrap}>
            <div className={styles.mobileBrand}>
              <div className={styles.mobileMark}>
                <PackageCheck size={20} />
              </div>
              <p className={styles.eyebrow}>Allo Health</p>
            </div>

            <div className={styles.formCard}>
              <p className={styles.eyebrow}>Allo Health</p>
              <h1 className={styles.title}>Create your account</h1>
              <p className={styles.subtitle}>Start shopping with live warehouse visibility and secure checkout.</p>

              <form action={handleSubmit} className={styles.formContent}>
                <div className={styles.registerFields}>
                  <FieldIcon label="Full name" htmlFor="name" icon={<UserRound size={16} />}>
                    <Input id="name" name="name" type="text" placeholder="Your name" required autoComplete="name" className={styles.inputWithLeftIcon} />
                  </FieldIcon>

                  <FieldIcon label="Email address" htmlFor="email" icon={<Mail size={16} />}>
                    <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" className={styles.inputWithLeftIcon} />
                  </FieldIcon>

                  <PasswordField id="password" name="password" label="Password" placeholder="Minimum 6 characters" show={showPassword} setShow={setShowPassword} />

                  <PasswordField
                    id="confirmPassword"
                    name="confirmPassword"
                    label="Confirm password"
                    placeholder="Re-enter password"
                    show={showConfirmPassword}
                    setShow={setShowConfirmPassword}
                  />
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <Button type="submit" className={styles.submit} disabled={loading}>
                  {loading ? "Creating account..." : "Create account"}
                </Button>
              </form>

              <div className={styles.switchBox}>
                Already have an account?{" "}
                <Link href="/auth/login" className={styles.switchLink}>
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.hero}>
          <img
            src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1600&h=1200&fit=crop&auto=format&q=85"
            alt="Digital healthcare workspace"
            className={styles.heroImage}
          />
          <div className={styles.heroOverlayRegister} />
          <div className={styles.heroContent}>
            <div className={styles.pill}>
              <Sparkles size={14} />
              Fast setup
            </div>

            <div className={styles.heroCopy}>
              <h2 className={styles.heroTitle}>Your cart waits. Stock is held only when you pay.</h2>
              <div className={styles.heroCards}>
                {["Browse without reservation pressure", "See available units across warehouses", "Pay through verified Razorpay test checkout"].map((item) => (
                  <div key={item} className={styles.heroLine}>
                    <ShieldCheck size={16} color="#54d6b6" />
                    <span className={styles.heroLineText}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className={styles.heroFoot}>Allo Health inventory reservation demo.</p>
          </div>
        </section>
      </div>
    </main>
  )
}

function FieldIcon({ label, htmlFor, icon, children }: { label: string; htmlFor: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className={styles.inputWrap}>
        <span className={styles.fieldIcon}>{icon}</span>
        {children}
      </div>
    </div>
  )
}

function PasswordField({
  id,
  name,
  label,
  placeholder,
  show,
  setShow,
}: {
  id: string
  name: string
  label: string
  placeholder: string
  show: boolean
  setShow: (value: boolean) => void
}) {
  return (
    <div className={styles.field}>
      <Label htmlFor={id}>{label}</Label>
      <div className={styles.inputWrap}>
        <LockKeyhole className={styles.fieldIcon} size={16} />
        <Input id={id} name={name} type={show ? "text" : "password"} placeholder={placeholder} required minLength={6} autoComplete="new-password" className={styles.passwordInput} />
        <button type="button" onClick={() => setShow(!show)} className={styles.eyeButton} aria-label={show ? "Hide password" : "Show password"}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}

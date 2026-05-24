"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { getCartCount, CART_UPDATED_EVENT } from "@/lib/cart"
import styles from "@/styles/Navbar.module.css"

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [cartCount, setCartCount] = useState(() => (typeof window === "undefined" ? 0 : getCartCount()))
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session)
      setUserEmail(session?.user.email ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handler = () => setCartCount(getCartCount())
    window.addEventListener(CART_UPDATED_EVENT, handler)
    return () => window.removeEventListener(CART_UPDATED_EVENT, handler)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileOpen])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setDropdownOpen(false)
    router.push("/")
    router.refresh()
  }

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "AL"
  const displayName = userEmail?.split("@")[0] ?? "Account"

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/products", label: "Products" },
    { href: "/orders", label: "Orders" },
    { href: "/billing", label: "Billing" },
  ]

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <button
          type="button"
          className={styles.mobileToggle}
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <CloseIcon /> : <MenuIcon />}
        </button>

        <Link href="/" className={styles.brand}>
          <div className={styles.brandIcon}>
            <div className={styles.brandGlow} />
            <LeafIcon />
          </div>
          <div className={styles.brandText}>
            <span className={styles.brandName}>Allo Health</span>
            <span className={styles.brandSub}>
              Care commerce
            </span>
          </div>
        </Link>

        <nav className={styles.nav}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navLink} ${pathname === link.href ? styles.navLinkActive : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          {isLoggedIn === true ? (
            <Link href="/profile" className={styles.mobileAccount} aria-label="Open profile">
              {initials}
            </Link>
          ) : isLoggedIn === false ? (
            <Link href="/auth/login" className={styles.mobileAccount} aria-label="Sign in">
              <UserCircleIcon />
            </Link>
          ) : null}

          {isLoggedIn === true && (
            <Link
              href="/cart"
              className={`${styles.cartLink} ${pathname === "/cart" ? styles.cartActive : ""}`}
            >
              <CartIcon />
              <span className={styles.cartText}>Cart</span>
              {cartCount > 0 && (
                <span className={styles.cartBadge}>
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
          )}

          {isLoggedIn === null ? (
            <div className={styles.skeleton} />
          ) : isLoggedIn ? (
            <div className={styles.profileWrap} ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={styles.profileButton}
                aria-label="Open profile menu"
              >
                <span className={styles.initials}>
                  {initials}
                </span>
                <span className={styles.profileName}>{displayName}</span>
                <ChevronDownIcon className={`${styles.chevron} ${dropdownOpen ? styles.chevronOpen : ""}`} />
              </button>

              {dropdownOpen && (
                <div className={styles.menu}>
                  <div className={styles.menuHead}>
                    <div className={styles.menuGlow} />
                    <div className={styles.menuUser}>
                      <div className={styles.menuAvatar}>
                        {initials}
                      </div>
                      <div>
                        <p className={styles.signedIn}>Signed in</p>
                        <p className={styles.menuEmail}>{userEmail}</p>
                      </div>
                    </div>
                  </div>

                  <div className={styles.menuBody}>
                    <DropdownLink href="/profile" onClick={() => setDropdownOpen(false)} icon={<UserCircleIcon />} label="My Profile" />
                    <DropdownLink href="/orders" onClick={() => setDropdownOpen(false)} icon={<ClipboardListIcon />} label="Order History" />
                    <DropdownLink href="/billing" onClick={() => setDropdownOpen(false)} icon={<ReceiptIcon />} label="Billing Status" />
                  </div>

                  <div className={styles.menuFoot}>
                    <button
                      onClick={handleSignOut}
                      className={styles.signOut}
                    >
                      <LogoutIcon />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.guestActions}>
              <Link
                href="/auth/login"
                className={styles.signIn}
              >
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className={styles.getStarted}
              >
                Get started
              </Link>
            </div>
          )}
        </div>
      </div>

      {mobileOpen && (
        <div className={styles.mobileLayer}>
          <button
            type="button"
            className={styles.mobileBackdrop}
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
          />
          <aside className={styles.mobilePanel}>
            <div className={styles.mobileHead}>
              <div>
                <p className={styles.mobileEyebrow}>Menu</p>
                <h2 className={styles.mobileTitle}>Allo Health</h2>
              </div>
              <button
                type="button"
                className={styles.mobileClose}
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
              >
                <CloseIcon />
              </button>
            </div>

            <nav className={styles.mobileNav}>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`${styles.mobileNavLink} ${pathname === link.href ? styles.mobileNavLinkActive : ""}`}
                >
                  {link.label}
                </Link>
              ))}
              {isLoggedIn === true && (
                <Link
                  href="/cart"
                  onClick={() => setMobileOpen(false)}
                  className={`${styles.mobileNavLink} ${pathname === "/cart" ? styles.mobileNavLinkActive : ""}`}
                >
                  Cart {cartCount > 0 ? `(${cartCount > 99 ? "99+" : cartCount})` : ""}
                </Link>
              )}
              {isLoggedIn === true && (
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className={`${styles.mobileNavLink} ${pathname === "/profile" ? styles.mobileNavLinkActive : ""}`}
                >
                  Profile
                </Link>
              )}
            </nav>

            <div className={styles.mobileFooter}>
              {isLoggedIn ? (
                <button type="button" className={styles.mobileSignOut} onClick={handleSignOut}>
                  Sign out
                </button>
              ) : (
                <div className={styles.mobileAuth}>
                  <Link href="/auth/login" onClick={() => setMobileOpen(false)} className={styles.mobileSecondary}>Sign in</Link>
                  <Link href="/auth/register" onClick={() => setMobileOpen(false)} className={styles.mobilePrimary}>Get started</Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </header>
  )
}

function DropdownLink({
  href,
  label,
  icon,
  onClick,
}: {
  href: string
  label: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={styles.dropdownLink}
    >
      {icon}
      {label}
    </Link>
  )
}

function LeafIcon() {
  return (
    <svg className={styles.iconWhite} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.25v13m0-13C10.83 5.48 9.25 5 7.5 5S4.17 5.48 3 6.25v13C4.17 18.48 5.75 18 7.5 18s3.33.48 4.5 1.25m0-13C13.17 5.48 14.75 5 16.5 5s3.33.48 4.5 1.25v13C19.83 18.48 18.25 18 16.5 18s-3.33.48-4.5 1.25" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg className={styles.iconSmall} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.4c.5 0 .95.34 1.08.83l.38 1.44m2.39 8.98h11.22c1.12-2.3 2.1-4.68 2.92-7.14A60.1 60.1 0 005.1 5.27m2.4 8.98L5.1 5.27M6 20.25h.01m12.74 0h.01" />
    </svg>
  )
}

function UserCircleIcon() {
  return (
    <svg className={styles.iconMuted} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.98 18.73A7.49 7.49 0 0012 15.75a7.49 7.49 0 00-5.98 2.98m11.96 0a9 9 0 10-11.96 0m11.96 0A8.97 8.97 0 0112 21a8.97 8.97 0 01-5.98-2.27M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function ClipboardListIcon() {
  return (
    <svg className={styles.iconMuted} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  )
}

function ReceiptIcon() {
  return (
    <svg className={styles.iconMuted} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 3.75h12v16.5l-2.25-1.5-2.25 1.5-2.25-1.5L9 20.25l-3-2V3.75z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25h6M9 12h6M9 15.75h3" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg className={styles.iconSmall} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg className={styles.iconSmall} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className={styles.iconSmall} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Eye, EyeOff, LockKeyhole, RefreshCw, Search, UserRound } from "lucide-react"
import styles from "@/styles/Admin.module.css"

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"
const ADMIN_SESSION_KEY = "allo_admin_session"

type AdminSection = "overview" | "users" | "billing" | "stock"

type Dashboard = {
  summary: {
    usersRegistered: number
    totalProducts: number
    totalPurchases: number
    successfulBillings: number
    failedBillings: number
    pendingBillings: number
    revenue: number
    totalUnits: number
    reservedUnits: number
    availableUnits: number
  }
  analytics: {
    purchases: number
    failedPayments: number
    pendingReservations: number
    revenue: number
    averageOrderValue: number
    conversionFromReservation: number
  }
  users: Array<{
    userId: string
    name: string
    username: string
    email: string
    reservations: number
    purchases: number
    failedBillings: number
    pendingBillings: number
    totalSpent: number
    lastActivity: string | null
    firstSeen: string | null
  }>
  billing: Array<{
    id: string
    userId: string
    customerName: string
    customerUsername: string
    customerEmail: string | null
    productName: string
    warehouseName: string
    warehouseLocation: string
    quantity: number
    amount: number
    status: "SUCCESS" | "FAILED" | "PENDING"
    date: string
    reason: string
  }>
  stock: Array<{
    id: string
    productName: string
    warehouseName: string
    warehouseLocation: string
    totalUnits: number
    reservedUnits: number
    availableUnits: number
  }>
}

export function AdminClient({ section = "overview" }: { section?: AdminSection }) {
  const router = useRouter()
  const pathname = usePathname()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loggedIn, setLoggedIn] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [stockSearch, setStockSearch] = useState("")
  const [stockWarehouse, setStockWarehouse] = useState("all")
  const [stockStatus, setStockStatus] = useState("all")
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    queueMicrotask(() => {
      const saved = readAdminSession()
      if (!saved) {
        setBootstrapping(false)
        return
      }

      setUsername(saved.username)
      setPassword(saved.password)
      void loadDashboard(saved.username, saved.password, false).finally(() => setBootstrapping(false))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileSidebarOpen ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileSidebarOpen])

  async function loadDashboard(nextUsername = username, nextPassword = password, persist = true) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${BACKEND}/api/admin/dashboard`, {
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Username": nextUsername,
          "X-Admin-Password": nextPassword,
        },
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Admin login failed")
        setLoggedIn(false)
        return
      }

      if (persist) saveAdminSession(nextUsername, nextPassword)
      setDashboard(data)
      setLoggedIn(true)
      if (pathname === "/admin") router.push("/admin/dashboard")
    } catch {
      setError("Could not reach admin API. Make sure the backend is running.")
      setLoggedIn(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await loadDashboard()
  }

  function handleLogout() {
    if (typeof window !== "undefined") sessionStorage.removeItem(ADMIN_SESSION_KEY)
    setLoggedIn(false)
    setDashboard(null)
    setPassword("")
    router.push("/admin")
  }

  const warehouseOptions = useMemo(() => {
    const names = new Set(dashboard?.stock.map((item) => item.warehouseName) ?? [])
    return ["all", ...Array.from(names).sort()]
  }, [dashboard])

  const filteredStock = useMemo(() => {
    const stock = dashboard?.stock ?? []
    return stock.filter((item) => {
      const searchMatch =
        stockSearch.trim().length === 0 ||
        `${item.productName} ${item.warehouseName} ${item.warehouseLocation}`
          .toLowerCase()
          .includes(stockSearch.toLowerCase())
      const warehouseMatch = stockWarehouse === "all" || item.warehouseName === stockWarehouse
      const statusMatch =
        stockStatus === "all" ||
        (stockStatus === "available" && item.availableUnits > 10) ||
        (stockStatus === "low" && item.availableUnits > 0 && item.availableUnits <= 10) ||
        (stockStatus === "out" && item.availableUnits === 0) ||
        (stockStatus === "reserved" && item.reservedUnits > 0)
      return searchMatch && warehouseMatch && statusMatch
    })
  }, [dashboard, stockSearch, stockWarehouse, stockStatus])

  if (bootstrapping) {
    return <AdminBootScreen />
  }

  if (!loggedIn) {
    return <AdminLogin username={username} password={password} setUsername={setUsername} setPassword={setPassword} loading={loading} error={error} onSubmit={handleLogin} />
  }

  if (!dashboard) return null

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        {mobileSidebarOpen && (
          <button
            type="button"
            className={styles.sidebarBackdrop}
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close admin navigation"
          />
        )}

        <aside className={`${styles.sidebar} ${mobileSidebarOpen ? styles.sidebarOpen : ""}`}>
          <div className={styles.sidebarMobileTop}>
            <p className={styles.brandSub}>Admin menu</p>
            <button
              type="button"
              className={styles.mobileClose}
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Close admin navigation"
            >
              <CloseIcon />
            </button>
          </div>

          <div className={styles.sidebarSummary}>
            <div className={styles.brandRow}>
              <div className={styles.brandMark}>
                <ChartIcon />
              </div>
              <div>
                <p className={styles.brandName}>Allo Admin</p>
                <p className={styles.brandSub}>Operations</p>
              </div>
            </div>
            <div className={styles.sidebarStats}>
              <div className={styles.sidebarStat}>
                <p className={styles.sidebarStatLabel}>Purchases</p>
                <p className={styles.sidebarStatValue}>{dashboard.summary.totalPurchases}</p>
              </div>
              <div className={styles.sidebarStat}>
                <p className={styles.sidebarStatLabel}>Stock</p>
                <p className={styles.sidebarStatValue}>{dashboard.summary.availableUnits}</p>
              </div>
            </div>
          </div>

          <nav className={styles.nav}>
            <SidebarLink href="/admin/dashboard" active={section === "overview"} label="Overview - analytics" icon={<ChartIcon />} onClick={() => setMobileSidebarOpen(false)} />
            <SidebarLink href="/admin/userdetails" active={section === "users"} label="User details" icon={<UsersIcon />} onClick={() => setMobileSidebarOpen(false)} />
            <SidebarLink href="/admin/billingdetails" active={section === "billing"} label="Billing details" icon={<ReceiptIcon />} onClick={() => setMobileSidebarOpen(false)} />
            <SidebarLink href="/admin/stockdetails" active={section === "stock"} label="Stock details" icon={<PackageIcon />} onClick={() => setMobileSidebarOpen(false)} />
          </nav>

          <button
            onClick={handleLogout}
            className={styles.logout}
          >
            Logout
          </button>
        </aside>

        <section className={styles.content}>
          <div className={styles.mobileAdminTopbar}>
            <button
              type="button"
              className={styles.mobileMenuButton}
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open admin navigation"
            >
              <MenuIcon />
            </button>
            <div>
              <p className={styles.mobileTopEyebrow}>Allo Admin</p>
              <p className={styles.mobileTopTitle}>{sectionTitles[section]}</p>
            </div>
          </div>

          <header className={styles.header}>
            <div className={styles.headerTop}>
              <div>
                <p className={styles.eyebrow}>Admin dashboard</p>
                <h1 className={styles.title}>{sectionTitles[section]}</h1>
                <p className={styles.subcopy}>
                  Global data across users, reservations, billing outcomes, purchases, and stock.
                </p>
              </div>
              <button
                onClick={() => void loadDashboard(username, password, false)}
                className={styles.refresh}
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
            <div className={styles.headerStats}>
              <HeaderStat label="Revenue" value={`Rs. ${dashboard.summary.revenue.toLocaleString("en-IN")}`} />
              <HeaderStat label="Users" value={String(dashboard.summary.usersRegistered)} />
              <HeaderStat label="Reserved units" value={String(dashboard.summary.reservedUnits)} />
            </div>
          </header>

          {section === "overview" && <Overview dashboard={dashboard} />}
          {section === "users" && <UsersTable users={dashboard.users} />}
          {section === "billing" && <BillingTable billing={dashboard.billing} />}
          {section === "stock" && (
            <StockTable
              stock={filteredStock}
              totalRows={dashboard.stock.length}
              search={stockSearch}
              warehouse={stockWarehouse}
              status={stockStatus}
              warehouseOptions={warehouseOptions}
              setSearch={setStockSearch}
              setWarehouse={setStockWarehouse}
              setStatus={setStockStatus}
            />
          )}
        </section>
      </div>
    </main>
  )
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.headerStat}>
      <p className={styles.headerStatLabel}>{label}</p>
      <p className={styles.headerStatValue}>{value}</p>
    </div>
  )
}

function AdminBootScreen() {
  return (
    <main className={styles.boot}>
      <div className={styles.bootInner}>
        <div className={styles.bootIcon}>
          <ChartIcon />
        </div>
        <p className={styles.eyebrow}>Restoring admin session</p>
        <h1 className={styles.title}>Opening dashboard</h1>
      </div>
    </main>
  )
}

function AdminLogin({
  username,
  password,
  setUsername,
  setPassword,
  loading,
  error,
  onSubmit,
}: {
  username: string
  password: string
  setUsername: (value: string) => void
  setPassword: (value: string) => void
  loading: boolean
  error: string | null
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <main className={styles.loginPage}>
      <div className={styles.loginGrid}>
        <section className={styles.loginHero}>
          <img
            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1600&h=1200&fit=crop&auto=format&q=85"
            alt="Analytics dashboard"
            className={styles.loginHeroImage}
          />
          <div className={styles.loginHeroOverlay} />
          <div className={styles.loginHeroContent}>
            <div>
              <div className={styles.brandMark}>
                <ChartIcon />
              </div>
              <p className={styles.eyebrow}>Allo admin</p>
            </div>
            <div className={styles.loginHeroCopy}>
              <h1 className={styles.loginHeroTitle}>
                Operations, billing, and stock in one cockpit.
              </h1>
              <p className={styles.loginHeroText}>
                Review purchases, reservation outcomes, active users, and warehouse stock without touching the customer app.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.loginSide}>
          <form onSubmit={onSubmit} className={styles.loginCard}>
            <div>
              <p className={styles.eyebrow}>Secure entry</p>
              <h2 className={styles.loginFormTitle}>Admin login</h2>
              <p className={styles.loginHelp}>Use username admin and password admin.</p>
            </div>

            {error && <div className={styles.adminError}>{error}</div>}

            <label className={styles.adminLabel}>
              Username
              <div className={styles.adminInputWrap}>
                <UserRound className={styles.adminInputIcon} size={16} />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={styles.adminInput}
                  placeholder="admin"
                />
              </div>
            </label>
            <label className={styles.adminLabel}>
              Password
              <div className={styles.adminInputWrap}>
                <LockKeyhole className={styles.adminInputIcon} size={16} />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  className={styles.adminInput}
                  placeholder="admin"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className={styles.adminEye}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className={styles.adminSubmit}
            >
              {loading ? "Checking..." : "Login to dashboard"}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}

const sectionTitles: Record<AdminSection, string> = {
  overview: "Overview analytics",
  users: "User details",
  billing: "Billing details",
  stock: "Stock details",
}

function Overview({ dashboard }: { dashboard: Dashboard }) {
  const { summary, analytics } = dashboard
  const billingTotal = Math.max(1, summary.successfulBillings + summary.failedBillings)
  return (
    <div className={styles.spaceStack}>
      <div className={styles.metricGrid}>
        <Metric label="Users registered" value={String(summary.usersRegistered)} tone="dark" />
        <Metric label="Purchases" value={String(summary.totalPurchases)} tone="green" />
        <Metric label="Revenue" value={`Rs. ${summary.revenue.toLocaleString("en-IN")}`} tone="blue" />
        <Metric label="Available stock" value={String(summary.availableUnits)} tone="amber" />
      </div>

      <div className={styles.overviewGrid}>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Purchase analytics</h2>
          <div className={styles.progressGrid}>
            <ProgressCard label="Successful billings" value={summary.successfulBillings} total={billingTotal} color="bg-[#54d6b6]" />
            <ProgressCard label="Failed billings" value={summary.failedBillings} total={billingTotal} color="bg-red-400" />
          </div>
        </section>

        <section className={styles.darkPanel}>
          <p className={styles.eyebrow}>Performance</p>
          <div className={styles.infoStack}>
            <InfoLine label="Average order value" value={`Rs. ${Math.round(analytics.averageOrderValue).toLocaleString("en-IN")}`} />
            <InfoLine label="Reservation conversion" value={`${analytics.conversionFromReservation}%`} />
            <InfoLine label="Reserved units" value={String(summary.reservedUnits)} />
            <InfoLine label="Total stock units" value={String(summary.totalUnits)} />
          </div>
        </section>
      </div>
    </div>
  )
}

function UsersTable({ users }: { users: Dashboard["users"] }) {
  return (
    <TableShell
      emptyText="No user activity yet."
      header={
        <TableHeader columns="xl:grid-cols-[1.4fr_1fr_repeat(4,0.62fr)]">
          <span>Customer</span>
          <span>User ID / activity</span>
          <span>Reservations</span>
          <span>Purchases</span>
          <span>Failed</span>
          <span>Total spent</span>
        </TableHeader>
      }
    >
      {users.map((user) => (
        <div key={user.userId} className={`${styles.tableRow} ${styles.usersGrid}`}>
          <div>
            <p className={styles.primaryText}>{user.name}</p>
            <p className={styles.mutedText}>@{user.username}</p>
            <p className={styles.tinyMuted}>{user.email}</p>
          </div>
          <div>
            <p className={styles.monoTiny}>{user.userId}</p>
            <p className={styles.tinyMuted}>First seen {formatDate(user.firstSeen)}</p>
            <p className={styles.tinyMuted}>Last active {formatDate(user.lastActivity)}</p>
          </div>
          <TableNumber label="Reservations" value={user.reservations} />
          <TableNumber label="Purchases" value={user.purchases} />
          <TableNumber label="Failed" value={user.failedBillings} />
          <TableNumber label="Total spent" value={`Rs. ${user.totalSpent.toLocaleString("en-IN")}`} />
        </div>
      ))}
    </TableShell>
  )
}

function BillingTable({ billing }: { billing: Dashboard["billing"] }) {
  return (
    <TableShell
      emptyText="No billing records yet."
      header={
        <TableHeader columns="xl:grid-cols-[1.2fr_1fr_0.65fr_0.8fr_0.65fr]">
          <span>Product / bill ID</span>
          <span>Purchased by</span>
          <span>Status</span>
          <span>Date / warehouse</span>
          <span className={styles.amountRight}>Amount</span>
        </TableHeader>
      }
    >
      {billing.map((bill) => (
        <div key={bill.id} className={`${styles.tableRow} ${styles.billingGrid}`}>
          <div>
            <p className={styles.primaryText}>{bill.productName}</p>
            <p className={styles.tinyMuted}>{bill.reason}</p>
            <p className={styles.monoTiny}>{bill.id}</p>
          </div>
          <div>
            <p className={styles.primaryText}>{bill.customerName}</p>
            <p className={styles.mutedText}>@{bill.customerUsername}</p>
            <p className={styles.tinyMuted}>{bill.customerEmail ?? "Email unavailable"}</p>
          </div>
          <StatusPill status={bill.status} />
          <div>
            <p className={styles.primaryText}>{formatDate(bill.date)}</p>
            <p className={styles.tinyMuted}>{bill.warehouseName}</p>
          </div>
          <p className={`${styles.primaryText} ${styles.amountRight}`}>Rs. {bill.amount.toLocaleString("en-IN")}</p>
        </div>
      ))}
    </TableShell>
  )
}

function StockTable({
  stock,
  totalRows,
  search,
  warehouse,
  status,
  warehouseOptions,
  setSearch,
  setWarehouse,
  setStatus,
}: {
  stock: Dashboard["stock"]
  totalRows: number
  search: string
  warehouse: string
  status: string
  warehouseOptions: string[]
  setSearch: (value: string) => void
  setWarehouse: (value: string) => void
  setStatus: (value: string) => void
}) {
  return (
    <div className={styles.spaceStack}>
      <section className={styles.filters}>
        <div className={styles.searchWrap}>
          <Search className={styles.searchIcon} size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, warehouse, or city"
            className={styles.filterInput}
          />
        </div>
        <select
          value={warehouse}
          onChange={(e) => setWarehouse(e.target.value)}
          className={styles.filterSelect}
        >
          {warehouseOptions.map((option) => (
            <option key={option} value={option}>{option === "all" ? "All warehouses" : option}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All stock statuses</option>
          <option value="available">Healthy stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
          <option value="reserved">Has reserved units</option>
        </select>
      </section>

      <p className={styles.showing}>
        Showing <span className={styles.showingStrong}>{stock.length}</span> of {totalRows} stock rows.
      </p>

      <TableShell
        emptyText="No stock rows match your filters."
        header={
          <TableHeader columns="xl:grid-cols-[1.2fr_1fr_repeat(3,0.55fr)]">
            <span>Product</span>
            <span>Warehouse</span>
            <span>Total units</span>
            <span>Reserved</span>
            <span>Available</span>
          </TableHeader>
        }
      >
        {stock.map((item) => (
          <div key={item.id} className={`${styles.tableRow} ${styles.stockGrid}`}>
            <div>
              <p className={styles.primaryText}>{item.productName}</p>
              <StockStatus available={item.availableUnits} reserved={item.reservedUnits} />
            </div>
            <div>
              <p className={styles.primaryText}>{item.warehouseName}</p>
              <p className={styles.tinyMuted}>{item.warehouseLocation}</p>
            </div>
            <TableNumber label="Total" value={item.totalUnits} />
            <TableNumber label="Reserved" value={item.reservedUnits} />
            <TableNumber label="Available" value={item.availableUnits} />
          </div>
        ))}
      </TableShell>
    </div>
  )
}

function SidebarLink({ active, label, icon, href, onClick }: { active: boolean; label: string; icon: React.ReactNode; href: string; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`${styles.sidebarLink} ${active ? styles.sidebarLinkActive : ""}`}
    >
      {icon}
      {label}
    </Link>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "dark" | "green" | "blue" | "amber" }) {
  const classes = {
    dark: styles.metricDark,
    green: styles.metricGreen,
    blue: styles.metricBlue,
    amber: styles.metricAmber,
  }[tone]
  return (
    <div className={`${styles.metric} ${classes}`}>
      <p className={styles.metricValue}>{value}</p>
      <p className={styles.metricLabel}>{label}</p>
    </div>
  )
}

function ProgressCard({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const width = Math.round((value / total) * 100)
  const fillClass = color.includes("red") ? styles.redFill : styles.greenFill
  return (
    <div className={styles.progressCard}>
      <div className={styles.progressTop}>
        <p className={styles.progressLabel}>{label}</p>
        <p className={styles.progressValue}>{value}</p>
      </div>
      <div className={styles.progressTrack}>
        <div className={`${styles.progressFill} ${fillClass}`} style={{ width: `${width}%` }} />
      </div>
      <p className={styles.progressMeta}>{width}% of billing records</p>
    </div>
  )
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.infoLine}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  )
}

function TableShell({ children, emptyText, header }: { children: React.ReactNode; emptyText: string; header?: React.ReactNode }) {
  const isEmptyArray = Array.isArray(children) && children.length === 0
  return (
    <section className={styles.tableShell}>
      {isEmptyArray ? <div className={styles.empty}>{emptyText}</div> : <>{header}{children}</>}
    </section>
  )
}

function TableHeader({ children, columns }: { children: React.ReactNode; columns: string }) {
  const gridClass = columns.includes("1.4fr") ? styles.usersGrid : columns.includes("0.65fr") ? styles.billingGrid : styles.stockGrid
  return (
    <div className={`${styles.tableHeader} ${gridClass}`}>
      {children}
    </div>
  )
}

function TableNumber({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className={styles.tableNumberLabel}>{label}</p>
      <p className={styles.tableNumberValue}>{value}</p>
    </div>
  )
}

function StatusPill({ status }: { status: "SUCCESS" | "FAILED" | "PENDING" }) {
  const classes = {
    SUCCESS: styles.statusSuccess,
    FAILED: styles.statusFailed,
    PENDING: styles.statusPending,
  }[status]
  return <span className={`${styles.statusPill} ${classes}`}>{status}</span>
}

function StockStatus({ available, reserved }: { available: number; reserved: number }) {
  const text = available === 0 ? "Out of stock" : available <= 10 ? "Low stock" : "Healthy stock"
  const classes = available === 0 ? styles.stockOut : available <= 10 ? styles.stockLow : styles.stockGood
  return (
    <p className={classes}>
      {text}{reserved > 0 ? ` - ${reserved} reserved` : ""}
    </p>
  )
}

function formatDate(value: string | null) {
  if (!value) return "No activity"
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function readAdminSession() {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { username?: string; password?: string }
    if (!parsed.username || !parsed.password) return null
    return { username: parsed.username, password: parsed.password }
  } catch {
    return null
  }
}

function saveAdminSession(username: string, password: string) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ username, password }))
}

function ChartIcon() {
  return (
    <svg className={styles.iconSmall} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M8 16v-5m4 5V8m4 8v-7" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg className={styles.iconSmall} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 19a4 4 0 00-8 0M12 11a4 4 0 100-8 4 4 0 000 8zm6 8a3 3 0 00-2.1-2.86M18 7a3 3 0 10-1.5 2.6" />
    </svg>
  )
}

function ReceiptIcon() {
  return (
    <svg className={styles.iconSmall} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 3.75h12v16.5l-2.25-1.5-2.25 1.5-2.25-1.5L9 20.25l-3-2V3.75zM9 8h6M9 12h6M9 16h3" />
    </svg>
  )
}

function PackageIcon() {
  return (
    <svg className={styles.iconSmall} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5l8 4.25v8.5l-8 4.25-8-4.25v-8.5l8-4.25zM4 7.75l8 4.25 8-4.25M12 12v8.5" />
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

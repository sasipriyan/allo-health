import Link from "next/link"
import { Navbar } from "@/components/navbar"
import type { Metadata } from "next"
import styles from "@/styles/Home.module.css"

export const metadata: Metadata = {
  title: "Private Care, Ready When You Are",
  description: "Allo Health storefront with real-time stock visibility and secure reservations.",
}

export default function HomePage() {
  return (
    <div className={styles.shell}>
      <Navbar />

      <main>
        <section className={styles.hero}>
          <img
            src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1800&h=1200&fit=crop&auto=format&q=85"
            alt="Clinician reviewing a private care plan"
            className={styles.heroImage}
          />
          <div className={styles.heroOverlay} />
          <div className={styles.heroFade} />

          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <div className={styles.eyebrow}>
                <span className={styles.dot} />
                Doctor-led care across India
              </div>

              <h1 className={styles.heroTitle}>
                Private care, ready when you are.
              </h1>

              <p className={styles.heroText}>
                Consult online, choose clinically reviewed treatments, and get discreet delivery
                from stocked warehouses in Delhi, Mumbai, and Bangalore.
              </p>

              <div className={styles.actions}>
                <Link href="/products" className={styles.primaryAction}>
                  Explore products
                  <ArrowRightIcon className={styles.arrow} />
                </Link>
                <Link href="/auth/register" className={styles.secondaryAction}>
                  Start free account
                </Link>
              </div>

              <div className={styles.statsGrid}>
                {heroStats.map((stat) => (
                  <div key={stat.label} className={styles.heroStat}>
                    <p className={styles.heroStatValue}>{stat.value}</p>
                    <p className={styles.heroStatLabel}>{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.heroVisual}>
              <div className={styles.productFloat}>
                <img
                  src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=700&h=620&fit=crop&auto=format&q=85"
                  alt="Treatment products"
                  className={styles.productFloatImage}
                />
                <div className={styles.metricGrid}>
                  <Metric label="Stock held" value="10 min" />
                  <Metric label="Checkout" value="Secure" />
                </div>
              </div>

              <div className={styles.flowFloat}>
                <p className={styles.flowTitle}>Live reservation flow</p>
                <div className={styles.flowList}>
                  {reservationSteps.map((step, index) => (
                    <div key={step} className={styles.flowStep}>
                      <span className={styles.flowStepNumber}>{index + 1}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.marqueeSection}>
          <div className={styles.marqueeWrap}>
            <div className={styles.marqueeCard}>
              <div className={styles.marqueeTrack}>
                {[...careTags, ...careTags].map((tag, index) => (
                  <span key={`${tag}-${index}`} className={styles.tag}>
                    <span className={styles.tagDot} />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.label}>Shop by concern</p>
              <h2 className={styles.sectionTitle}>
                Treatments organized around real needs.
              </h2>
            </div>
            <p className={styles.sectionText}>
              Each category routes into the same live inventory system, so the demo shows
              what can be bought right now and what warehouse can fulfill it.
            </p>
          </div>

          <div className={styles.categoryGrid}>
            {categories.map((cat) => (
              <Link
                key={cat.label}
                href="/products"
                className={styles.categoryCard}
              >
                <img
                  src={cat.image}
                  alt={cat.label}
                  className={styles.categoryImage}
                />
                <div className={styles.categoryOverlay} />
                <div className={styles.categoryBody}>
                  <div className={styles.categoryIconBox}>
                    <cat.icon className={styles.icon} />
                  </div>
                  <h3 className={styles.categoryTitle}>{cat.label}</h3>
                  <p className={styles.categoryText}>{cat.desc}</p>
                  <span className={styles.categoryLink}>
                    View products
                    <ArrowRightIcon className={styles.arrow} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.popularBand}>
          <div className={styles.marqueeWrap}>
            <div className={styles.popularHeader}>
              <div>
                <p className={`${styles.label} ${styles.greenLabel}`}>Popular now</p>
                <h2 className={styles.sectionTitle}>Built for a smooth checkout demo.</h2>
              </div>
              <Link href="/products" className={styles.inventoryLink}>
                View full inventory
                <ArrowRightIcon className={styles.arrow} />
              </Link>
            </div>

            <div className={styles.productGrid}>
              {featured.map((product) => (
                <article key={product.name} className={styles.productCard}>
                  <div className={styles.productMedia}>
                    <img
                      src={product.image}
                      alt={product.name}
                      className={styles.productImage}
                      loading="lazy"
                    />
                    <div className={styles.priceBadge}>
                      Rs. {product.price.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className={styles.productBody}>
                    <div className={styles.productHeading}>
                      <h3 className={styles.productTitle}>{product.name}</h3>
                      <span className={styles.stockBadge}>
                        In stock
                      </span>
                    </div>
                    <p className={styles.productText}>{product.desc}</p>
                    <Link href="/products" className={styles.darkAction}>
                      Add from inventory
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.featureSection}>
          <div>
            <p className={styles.label}>Why it works</p>
            <h2 className={styles.sectionTitle}>
              Care feels simple because the hard parts are handled.
            </h2>
            <p className={styles.sectionText}>
              The experience stays calm for customers while the system handles stock,
              reservations, payment verification, and release paths behind the scenes.
            </p>
          </div>

          <div className={styles.pointGrid}>
            {whyAlloPoints.map((point) => (
              <div
                key={point.title}
                className={styles.pointCard}
              >
                <div className={styles.pointIconBox}>
                  <point.icon className={styles.icon} />
                </div>
                <h3 className={styles.pointTitle}>{point.title}</h3>
                <p className={styles.pointText}>{point.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.cta}>
          <img
            src="https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=1600&h=720&fit=crop&auto=format&q=85"
            alt="Secure online checkout"
            className={styles.ctaImage}
          />
          <div className={styles.ctaOverlay} />
          <div className={styles.ctaInner}>
            <p className={styles.eyebrow}>Ready to demo</p>
            <h2 className={styles.ctaTitle}>
              Reserve stock only when checkout begins.
            </h2>
            <p className={styles.ctaText}>
              Browse freely, pay securely, and watch inventory update without a manual refresh.
            </p>
            <Link href="/products" className={styles.ctaAction}>
              Go to products
              <ArrowRightIcon className={styles.arrow} />
            </Link>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandIcon}>
              <BookOpenIcon className={styles.arrow} />
            </span>
            <span className={styles.brandName}>Allo Health</span>
          </Link>
          <p className={styles.footerText}>
            Demo inventory platform for private wellness commerce. All products require a valid consultation.
          </p>
        </div>
      </footer>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metric}>
      <p className={styles.metricValue}>{value}</p>
      <p className={styles.metricLabel}>{label}</p>
    </div>
  )
}

const heroStats = [
  { value: "3", label: "fulfillment hubs" },
  { value: "10m", label: "checkout hold" },
  { value: "24/7", label: "care support" },
]

const reservationSteps = ["Cart stays flexible", "Stock is reserved at payment", "Order confirms after verification"]

const careTags = [
  "Hair care",
  "Sexual wellness",
  "Skin support",
  "Daily supplements",
  "Secure payments",
  "Live warehouse stock",
]

const categories = [
  {
    label: "Hair Care",
    desc: "Evidence-backed routines for hair fall, regrowth, and long-term maintenance.",
    image: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=700&h=900&fit=crop&auto=format&q=80",
    icon: DropletIcon,
  },
  {
    label: "Sexual Health",
    desc: "Private treatment options with clear guidance and discreet fulfillment.",
    image: "https://images.unsplash.com/photo-1511174511562-5f7f18b874f8?w=700&h=900&fit=crop&auto=format&q=80",
    icon: HeartPulseIcon,
  },
  {
    label: "Skin & Acne",
    desc: "Dermatology-inspired products for daily repair, clarity, and confidence.",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=700&h=900&fit=crop&auto=format&q=80",
    icon: SparkIcon,
  },
  {
    label: "Supplements",
    desc: "Simple additions for energy, recovery, sleep, and everyday wellness.",
    image: "https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=700&h=900&fit=crop&auto=format&q=80",
    icon: CapsuleIcon,
  },
]

const featured = [
  {
    name: "Minoxidil 5% Solution",
    price: 849,
    image: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800&h=560&fit=crop&auto=format&q=80",
    desc: "Topical hair regrowth support with warehouse availability visible before checkout.",
  },
  {
    name: "Finasteride 1mg Tablets",
    price: 1299,
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&h=560&fit=crop&auto=format&q=80",
    desc: "Prescription-led hair fall support that fits neatly into the reservation flow.",
  },
  {
    name: "Ashwagandha KSM-66",
    price: 799,
    image: "https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=800&h=560&fit=crop&auto=format&q=80",
    desc: "Daily wellness support with fast checkout and clear stock handling.",
  },
]

const whyAlloPoints = [
  {
    icon: ShieldCheckIcon,
    title: "Verified checkout",
    desc: "Payment confirmation is accepted only after Razorpay signature verification.",
  },
  {
    icon: TimerIcon,
    title: "Timed reservations",
    desc: "Inventory is held for checkout, then confirmed or released automatically.",
  },
  {
    icon: PackageIcon,
    title: "Warehouse clarity",
    desc: "Customers see stock by location before committing to purchase.",
  },
  {
    icon: RefreshIcon,
    title: "No stale cart pressure",
    desc: "Cart browsing stays relaxed because reservations start only at payment.",
  },
]

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? styles.arrow} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  )
}

function DropletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75S6.75 9.3 6.75 14.25a5.25 5.25 0 1010.5 0C17.25 9.3 12 3.75 12 3.75z" />
    </svg>
  )
}

function HeartPulseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0 5.25-9 10.5-9 10.5s-9-5.25-9-10.5A4.5 4.5 0 0111.25 5.7L12 6.5l.75-.8A4.5 4.5 0 0121 8.25z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 12h2l1-2.5 2 5 1.5-2.5h2.5" />
    </svg>
  )
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8L18 16z" />
    </svg>
  )
}

function CapsuleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 20.25a5.25 5.25 0 01-7.42-7.42l5.75-5.75a5.25 5.25 0 017.42 7.42l-5.75 5.75z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 10.5l6 6" />
    </svg>
  )
}

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75l7.5 3v5.5c0 4.45-3.1 7.85-7.5 9-4.4-1.15-7.5-4.55-7.5-9v-5.5l7.5-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.75 12.25l2.2 2.2 4.3-5" />
    </svg>
  )
}

function TimerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5v5l3 2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 2.75h6M12 21a8 8 0 100-16 8 8 0 000 16z" />
    </svg>
  )
}

function PackageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5l8 4.25v8.5l-8 4.25-8-4.25v-8.5l8-4.25z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7.75l8 4.25 8-4.25M12 12v8.5" />
    </svg>
  )
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 11a8 8 0 00-14.8-4.2L4 9.25m0 0h5.25M4 9.25V4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 13a8 8 0 0014.8 4.2L20 14.75m0 0h-5.25M20 14.75V20" />
    </svg>
  )
}

function BookOpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.25v13m0-13C10.83 5.48 9.25 5 7.5 5S4.17 5.48 3 6.25v13C4.17 18.48 5.75 18 7.5 18s3.33.48 4.5 1.25m0-13C13.17 5.48 14.75 5 16.5 5s3.33.48 4.5 1.25v13C19.83 18.48 18.25 18 16.5 18s-3.33.48-4.5 1.25" />
    </svg>
  )
}

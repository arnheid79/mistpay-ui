'use client'

import { useEffect } from 'react'

const WHATSAPP_BOT_URL = process.env.NEXT_PUBLIC_WHATSAPP_BOT_URL || 'https://wa.me/14155238886'
const TELEGRAM_BOT_URL = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || 'https://t.me/mistpaybot'
const GITHUB_URL = 'https://github.com/startup-dreamer/Mist-Pay'

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
}
function TelegramIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71l-4.14-3.05-2 1.92c-.21.21-.4.4-.82.4z"/></svg>
}
function GithubIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.284-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.386-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.605-2.665-.303-5.467-1.334-5.467-5.93 0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.5 11.5 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.604-.014 2.896-.014 3.293 0 .322.216.694.825.576C20.565 21.796 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
}

export default function HomePage() {
  useEffect(() => {
    const nav = document.getElementById('nav')
    const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })

    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            obs.unobserve(e.target)
          }
        }),
      { threshold: 0.12 }
    )
    document.querySelectorAll('.fade-up').forEach((el) => obs.observe(el))

    return () => {
      window.removeEventListener('scroll', onScroll)
      obs.disconnect()
    }
  }, [])

  return (
    <div className="mist-site">
      {/* NAV */}
      <nav id="nav">
        <a className="nav-brand" href="#hero">
          <div className="mark ghost" style={{ '--sz': '32px' } as React.CSSProperties}>
            <span className="g">M</span>
          </div>
          <span className="word">MistPay</span>
        </a>
        <div className="nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#requesters">Requesters</a>
          <a href="#payers">Payers</a>
          <a href="#pricing">Pricing</a>
        </div>
        <div className="nav-right">
          <a className="nav-social" href={WHATSAPP_BOT_URL} target="_blank" rel="noreferrer" aria-label="Chat with the WhatsApp bot">
            <WhatsAppIcon />
          </a>
          <a className="nav-social" href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer" aria-label="Chat with the Telegram bot">
            <TelegramIcon />
          </a>
          <a className="nav-signin" href="/dashboard">Sign in</a>
          <a className="btn btn-ghost btn-sm" href="https://docs.mistpay.in" target="_blank" rel="noreferrer">Get started</a>
        </div>

      </nav>

      {/* HERO */}
      <section id="hero" className="hero">
        <div className="hero-bg" />
        <div className="hero-grid" />
        <div className="hero-inner">
          <h1 className="display">Request. Anyone.<br />Anywhere.</h1>
          <p className="body-l">
            A WhatsApp message that settles as USDC on Tempo in seconds — payable by anyone with a phone number, whether or not they&apos;ve ever touched crypto.
          </p>
          <div className="hero-tracks">
            <span className="hero-track-chip">Privy</span>
            <span className="hero-track-chip">MoonPay</span>
            <span className="hero-track-chip">Tempo</span>
          </div>
          <div className="hero-cta">
            <a className="btn btn-signal btn-lg" href="#cta">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M13 6l8 6-8 6" /></svg>
              Start requesting
            </a>
            <a className="btn btn-ghost btn-lg" href="#how-it-works">See the full flow</a>
          </div>
        </div>
        <div className="hero-visual">
          {/* WhatsApp chat card */}
          <div className="hv-card hv-chat">
            <div className="chat-top">
              <div className="chat-bot-icon">M</div>
              <div>
                <div className="nm">MistPay Bot</div>
                <div className="st">WhatsApp · online</div>
              </div>
            </div>
            <div className="bbl me">request $50 from Juan</div>
            <div className="bbl bot">
              Done ✓ — Juan gets a link. He can pay with card or crypto, no account needed.
              <div className="lnk">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
                mist.pay/pay/j8n2xq
              </div>
            </div>
            <div className="bbl bot" style={{ marginTop: 4, opacity: 0.6, fontSize: 11 }}>
              &ldquo;Juan paid $50&rdquo; — instant
            </div>
          </div>
          {/* Payment page card */}
          <div className="hv-card hv-pay">
            <div className="pc-top">
              <div className="pc-av">AV</div>
              <div>
                <div className="nm">Ana Vargas</div>
                <div className="st">is requesting payment</div>
              </div>
            </div>
            <div className="pc-amt">$50</div>
            <div className="pc-conv">They receive exactly 50.00 USDC · Tempo</div>
            <button className="pc-btn pri">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
              Pay with card
            </button>
            <button className="pc-btn sec">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
              Pay with crypto · any chain
            </button>
            <div className="pc-foot">
              <div className="mark" style={{ '--sz': '14px' } as React.CSSProperties}><span className="g">M</span></div>
              mist.pay · secured on Tempo
            </div>
            <div className="settled">
              <div className="ok">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
              </div>
              Juan paid · 0.74s
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <div className="trust">
        <div className="container">
          <div className="trust-inner">
            <span className="trust-label">Built on</span>
            <div className="trust-divider" />
            <div className="trust-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>
              Privy
            </div>
            <div className="trust-divider" />
            <div className="trust-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg>
              Relay
            </div>
            <div className="trust-divider" />
            <div className="trust-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
              Tempo
            </div>
            <div className="trust-divider" />
            <div className="trust-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
              WhatsApp-native
            </div>
          </div>
        </div>
      </div>

      {/* PROOF */}
      <section className="proof">
        <div className="container">
          <div className="section-hd center fade-up">
            <div className="label">Why this matters</div>
            <h2 className="headline">The world already moves money. It just doesn&apos;t reach everyone.</h2>
            <p className="body-l">Billions of dollars cross borders every year, and billions of people are already one WhatsApp chat away. MistPay connects the two.</p>
          </div>
          <div className="proof-grid fade-up d1">
            <div className="proof-stat">
              <div className="proof-val">$690B</div>
              <div className="proof-lbl">moved through global remittances every year</div>
              <div className="proof-src">World Bank / KNOMAD, 2025</div>
            </div>
            <div className="proof-stat">
              <div className="proof-val">1.3B</div>
              <div className="proof-lbl">adults worldwide with no bank account at all</div>
              <div className="proof-src">World Bank, Global Findex 2025</div>
            </div>
            <div className="proof-stat">
              <div className="proof-val">3B+</div>
              <div className="proof-lbl">people active on WhatsApp every month</div>
              <div className="proof-src">Meta, 2025</div>
            </div>
            <div className="proof-stat">
              <div className="proof-val">200M+</div>
              <div className="proof-lbl">businesses already running their storefront on WhatsApp</div>
              <div className="proof-src">Meta, 2025</div>
            </div>
          </div>
        </div>
      </section>

      {/* TWO SIDES */}
      <section id="how-it-works" className="two-sides">
        <div className="container">
          <div className="section-hd center fade-up">
            <div className="label">How it works</div>
            <h2 className="headline">Pay. Request. Split. Done.</h2>
            <p className="body-l">Crypto rails behind the scenes so your customers never have to think about them. Requesters sign in once. Payers never create an account.</p>
          </div>
          <div className="sides-grid">
            <div className="side-card payer-side fade-up d1">
              <div className="side-tag">For the payer</div>
              <h3>Open a link.<br />Pay. Done.</h3>
              <p className="side-sub">You receive a payment link on WhatsApp. No app install, no account, no wallet setup — ever.</p>
              <div className="side-steps">
                {[
                  { t: 'Receive a link on WhatsApp', s: 'No app, no signup required' },
                  { t: 'Payment page loads instantly', s: 'Amount, memo, requester — in one glance' },
                  { t: 'Choose: card or crypto', s: 'Card, Apple Pay, or crypto from any chain' },
                  { t: 'Payment sent. Tx hash. Done.', s: 'No account created. Identity is just an email receipt.' },
                ].map((step, i) => (
                  <div className="side-step" key={i}>
                    <div className="side-step-num">{i + 1}</div>
                    <div>
                      <div className="side-step-t">{step.t}</div>
                      <div className="side-step-s">{step.s}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="side-pill">Zero onboarding · always</div>
            </div>
            <div className="side-card req-side fade-up d2">
              <div className="side-tag">For the requester</div>
              <h3>Text the bot.<br />Get paid.</h3>
              <p className="side-sub">Sign in once with your phone. Then create requests from WhatsApp or the app — your choice.</p>
              <div className="side-steps">
                {[
                  { t: 'Sign in with phone OTP or WhatsApp', s: 'No seed phrase, no wallet setup' },
                  { t: 'Choose your mode', s: 'Personal splits or business invoicing' },
                  { t: 'Text "request $50 from Juan" or use the app', s: 'Request created, link returned instantly' },
                  { t: 'USDC lands · WhatsApp notifies you', s: 'Hold, or bank offramp' },
                ].map((step, i) => (
                  <div className="side-step" key={i}>
                    <div className="side-step-num">{i + 1}</div>
                    <div>
                      <div className="side-step-t">{step.t}</div>
                      <div className="side-step-s">{step.s}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="side-pill">Dashboard · invoices · balance</div>
            </div>
          </div>
        </div>
      </section>

      {/* REQUESTER JOURNEY */}
      <section id="requesters" className="req-journey">
        <div className="container">
          <div className="section-hd center fade-up">
            <div className="label">WhatsApp-native requests</div>
            <h2 className="headline">Request money right where the deal happened.</h2>
            <p className="body-l">Send payment links without leaving the chat. Your business runs on WhatsApp. Payments should too.</p>
          </div>
          <div className="dual-entry fade-up d1">
            <div className="entry-card wa">
              <div className="entry-tag">Via WhatsApp</div>
              <h4>The bot command</h4>
              <p>Never leave WhatsApp. One command creates a payment request and returns a link — all in the same thread.</p>
              <div className="wa-cmd">
                <div className="wa-cmd-lbl">You type</div>
                <div className="wa-cmd-text">request $50 from Juan</div>
              </div>
              <div className="entry-steps">
                {[
                  'Bot parses amount, payer name, memo',
                  'The request id becomes the payment memo',
                  'Payment link returned in the same chat',
                ].map((t, i) => (
                  <div className="entry-step" key={i}><div className="dot" /><div className="t">{t}</div></div>
                ))}
              </div>
            </div>
            <div className="entry-card app">
              <div className="entry-tag">Via App</div>
              <h4>The manual form</h4>
              <p>For group splits, business invoices, and anything that needs more than a one-liner command.</p>
              <div style={{ height: 44 }} />
              <div className="entry-steps">
                {[
                  'Fill amount, note, split config',
                  'Add business extras: invoice no., due date, tax',
                  'Equal split / custom amounts / one payer',
                ].map((t, i) => (
                  <div className="entry-step" key={i}><div className="dot" /><div className="t">{t}</div></div>
                ))}
              </div>
            </div>
          </div>
          <div className="merge-bar fade-up d2">
            <div className="ml">
              <div className="merge-lbl">Both paths converge here</div>
              <div className="merge-title">Payment request created</div>
              <div className="merge-sub">USDC · Tempo</div>
            </div>
            <div className="merge-chain">
              <div className="mc-node">Shareable link generated</div>
              <div className="mc-arr">→</div>
              <div className="mc-node">mist.pay/pay/abc123</div>
              <div className="mc-arr">→</div>
              <div className="mc-node">Sent to payer via WhatsApp</div>
            </div>
          </div>
        </div>
      </section>

      {/* PAYER JOURNEY */}
      <section id="payers" className="payer-journey">
        <div className="container">
          <div className="section-hd center fade-up">
            <div className="label">Paying</div>
            <h2 className="headline">Open a link.<br />Pay. Done.</h2>
            <p className="body-l">No app. No signup. No wallet. The fastest settlement your customers will never know is crypto.</p>
          </div>
          <div className="payer-flow-grid">
            <div className="payer-steps fade-up d1">
              <div className="payer-step">
                <div className="ps-icon teal">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D7A50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                </div>
                <div>
                  <div className="ps-t">Payer gets link on WhatsApp</div>
                  <div className="ps-s">No app install, no signup — just a URL</div>
                </div>
              </div>
              <div className="payer-step">
                <div className="ps-icon teal">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D7A50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /></svg>
                </div>
                <div>
                  <div className="ps-t">Payment page loads</div>
                  <div className="ps-s">Amount, memo, who&apos;s asking — instant</div>
                </div>
              </div>
              <div className="payer-step">
                <div className="ps-icon ambr">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A55B00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
                </div>
                <div>
                  <div className="ps-t">Choose payment method</div>
                  <div className="ps-s">Card or crypto — two separate flows</div>
                  <div className="ps-branches">
                    <div className="ps-branch teal">
                      <div className="bt">Card checkout</div>
                      <div className="bs">Card or Apple Pay<br />Fee shown up front<br />Fiat → USDC via MoonPay</div>
                    </div>
                    <div className="ps-branch purp">
                      <div className="bt">Crypto checkout</div>
                      <div className="bs">Tempo wallet or any chain<br />Passkey or deposit QR<br />Exact amount delivered</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="payer-step">
                <div className="ps-icon ambr">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A55B00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                </div>
                <div>
                  <div className="ps-t">Payment verified on-chain</div>
                  <div className="ps-s">USDC lands on Tempo — every path settles here</div>
                </div>
              </div>
              <div className="payer-step">
                <div className="ps-icon teal">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D7A50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
                </div>
                <div>
                  <div className="ps-t">Payer sees confirmation</div>
                  <div className="ps-s">Tx hash, done — no account created</div>
                </div>
              </div>
            </div>
            {/* Payment page mockup */}
            <div className="pay-page-mock fade-up d2">
              <div className="ppm-nav">
                <span className="ppm-back">← mist.pay/pay/j8n2xq</span>
                <span className="ppm-exp">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                  23h 41m
                </span>
              </div>
              <div className="ppm-req">
                <div className="ppm-av">AV</div>
                <div>
                  <div className="ppm-name">Ana Vargas</div>
                  <div className="ppm-sub">is requesting payment</div>
                </div>
              </div>
              <div className="ppm-memo">Dinner split — Rosetta, Friday</div>
              <div className="ppm-amt">$50.00</div>
              <div className="ppm-conv">They receive exactly 50.00 USDC · settles on Tempo</div>
              <button className="ppm-btn pri">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
                Pay with card
              </button>
              <button className="ppm-btn sec">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                Pay with crypto · any chain
              </button>
              <div className="ppm-foot">
                <div className="mark" style={{ '--sz': '18px' } as React.CSSProperties}><span className="g">M</span></div>
                <span className="mono" style={{ marginLeft: 5 }}>secured by MistPay</span>
                <span className="badge badge-default" style={{ marginLeft: 'auto' }}><span className="dot" />Open</span>
              </div>
              <div className="ppm-confirmed">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
                Confirmed · 0.74s · no account created
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BUSINESS MODE */}
      <section className="biz-mode">
        <div className="container">
          <div className="biz-grid">
            <div className="biz-text fade-up">
              <div className="label">Business mode</div>
              <h2 className="headline">Every invoice, every payment — in one place.</h2>
              <p className="body-l">No more chasing. No more spreadsheets. Your books stay clean without lifting a finger.</p>
              <div className="biz-feats">
                <div className="biz-feat">
                  <div className="biz-feat-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5469D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                  </div>
                  <div>
                    <div className="biz-feat-t">Invoice number, due date, line items, tax</div>
                    <div className="biz-feat-s">Create via WhatsApp command or the in-app form</div>
                  </div>
                </div>
                <div className="biz-feat">
                  <div className="biz-feat-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5469D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
                  </div>
                  <div>
                    <div className="biz-feat-t">Invoice auto-marked paid on settlement</div>
                    <div className="biz-feat-s">USDC lands → invoice marked settled → dashboard updated</div>
                  </div>
                </div>
                <div className="biz-feat">
                  <div className="biz-feat-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5469D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
                  </div>
                  <div>
                    <div className="biz-feat-t">Recurring collections</div>
                    <div className="biz-feat-s">Request next invoice from dashboard with one tap</div>
                  </div>
                </div>
              </div>
              <p className="body" style={{ marginBottom: 24 }}>Stop juggling apps. Invoicing, crypto, and payments in one flow. Built for markets where payment gateways fail you — and customers don&apos;t want to learn wallets.</p>
              <a className="btn btn-ink" href="#cta">Set up business account</a>
            </div>
            {/* Invoice mockup */}
            <div className="invoice-mock fade-up d2">
              <div className="inv-head">
                <div>
                  <div className="inv-brand">Ana Vargas Studio</div>
                  <div className="inv-num">Invoice #INV-0042</div>
                </div>
                <div className="inv-paid">PAID</div>
              </div>
              <div className="inv-meta">
                <div>
                  <div className="inv-meta-lbl">To</div>
                  <div className="inv-meta-val">Acme Corp</div>
                  <div className="inv-meta-sub">acme@example.com</div>
                </div>
                <div>
                  <div className="inv-meta-lbl">Due date</div>
                  <div className="inv-meta-val">Jun 21, 2026</div>
                  <div className="inv-meta-sub" style={{ color: 'var(--success)' }}>Paid Jun 14 · 0.74s</div>
                </div>
              </div>
              <div className="inv-lines">
                <div className="inv-line"><span className="item">Design work · 10h</span><span className="amt">$800.00</span></div>
                <div className="inv-line"><span className="item">UI review session</span><span className="amt">$150.00</span></div>
                <div className="inv-line"><span className="item">Tax (8%)</span><span className="amt">$76.00</span></div>
              </div>
              <div className="inv-total">
                <span className="t">Total</span>
                <span className="a">$1,026.00</span>
              </div>
              <div className="inv-foot">
                <span>mist.pay/pay/inv042</span>
                <span>USDC · Tempo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TECHNOLOGY */}
      <section id="technology" className="tech">
        <div className="container">
          <div className="section-hd center fade-up">
            <div className="label">Technology</div>
            <h2 className="headline">Three technologies. One product that couldn&apos;t exist without all of them.</h2>
          </div>
          <div className="tech-grid">
            <div className="tech-card fade-up d1">
              <div className="tech-badge tb-magic">Privy · Embedded Wallets</div>
              <h3>Frictionless identity for both sides</h3>
              <p className="body">Privy pregenerates the receiver&apos;s wallet from their phone number, before they&apos;ve ever logged in — so a request has somewhere to land the instant it&apos;s created. Payers can use a passkey wallet in one tap. No seed phrases. No installs on either side.</p>
              <div className="tech-code">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                pregenerateWallets()
              </div>
            </div>
            <div className="tech-card fade-up d2">
              <div className="tech-badge tb-particle">Relay · Cross-chain</div>
              <h3>Pay from any chain without bridging</h3>
              <p className="body">Payer has USDC on Base or Ethereum? MistPay gives them a single-use deposit address. They send from any wallet or exchange, and Relay delivers exactly the requested amount on Tempo — anything extra or missing is refunded. They never bridge manually.</p>
              <div className="tech-code">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                strict deposit address
              </div>
            </div>
            <div className="tech-card fade-up d3">
              <div className="tech-badge tb-arb">Tempo · TIP-20</div>
              <h3>The payment carries its own reference</h3>
              <p className="body">Every request id is a 32-byte memo carried by the stablecoin transfer itself. Non-custodial — funds move directly from payer to receiver, and MistPay only counts a payment once its memo and amount are verified on-chain. Network fees are sponsored and measured in fractions of a cent.</p>
              <div className="tech-code">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                transferWithMemo()
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COST PROOF */}
      <section className="cost-proof">
        <div className="container">
          <div className="section-hd center fade-up">
            <div className="label">Proof, not promises</div>
            <h2 className="headline">What it actually costs to move $200 across a border.</h2>
          </div>
          <div className="cp-bars fade-up d1">
            {[
              { name: 'Bank wire', sub: 'most expensive provider type', val: '14.99%', w: 99.9 },
              { name: 'Global average', sub: 'across all provider types', val: '6.36%', w: 42.4 },
              { name: 'PayPal, cross-border + FX', sub: '2.99% base + 1.5% cross-border + 4% FX', val: '8.49%', w: 56.6 },
              { name: 'Tempo settlement', sub: 'the rail MistPay settles on', val: '<$0.001', w: 1, hero: true },
            ].map((row) => (
              <div className="cp-row" key={row.name}>
                <div className="cp-name">{row.name}<span className="cp-sub">{row.sub}</span></div>
                <div className="cp-track"><div className={`cp-fill${row.hero ? ' cp-hero' : ''}`} style={{ width: `${row.w}%` }} /></div>
                <div className={`cp-val${row.hero ? ' cp-hero' : ''}`}>{row.val}</div>
              </div>
            ))}
          </div>
          <div className="cp-stats fade-up d2">
            <div className="cp-stat">
              <div className="cp-stat-val">1–5 days</div>
              <div className="cp-stat-lbl">to settle a bank wire — up to 3 weeks in slow-to-pay corridors</div>
              <div className="cp-stat-src">Wire-transfer settlement guidance, 2025</div>
            </div>
            <div className="cp-stat">
              <div className="cp-stat-val">~0.5s</div>
              <div className="cp-stat-lbl">block time on Tempo — payments are final once included, then the receiver is notified on WhatsApp</div>
              <div className="cp-stat-src">Tempo docs — ~0.5 s blocks with deterministic finality (no reorgs)</div>
            </div>
          </div>
          <p className="cp-sources fade-up d2">Sources: cost — World Bank Remittance Prices Worldwide, Q3 2025; PayPal Merchant &amp; Business Fees, Aug 2025 (fee lines shown as disclosed, stacked for a cross-border card payment requiring conversion). speed — Wise/industry wire-transfer guidance 2025; Tempo documentation.</p>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="pricing">
        <div className="container">
          <div className="section-hd center fade-up">
            <div className="label">Pricing</div>
            <h2 className="headline">You only pay when you get paid.</h2>
            <p className="body-l">No monthly fees. No setup costs. A small percentage only on fulfilled requests.</p>
          </div>
          <div className="pricing-grid">
            <div className="price-card fade-up d1">
              <div className="label">Create requests</div>
              <div className="price-val">Free</div>
              <div className="price-desc">per payment request, always</div>
              <div className="price-divider" />
              <h3>Always free to request</h3>
              <p className="body">Create unlimited payment requests. Single or group splits. Personal or invoice mode. WhatsApp or in-app.</p>
            </div>
            <div className="price-card featured fade-up d2">
              <div className="label">Per payment</div>
              <div className="price-val">2%</div>
              <div className="price-desc">only when a payment is fulfilled</div>
              <div className="price-divider" />
              <h3 style={{ color: 'var(--paper)' }}>Success-only fee</h3>
              <p className="body">On a $50 request: $1. On a $500 invoice: $10. If your payer doesn&apos;t pay, you pay nothing.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-sect">
        <div className="container">
          <div className="section-hd center fade-up">
            <div className="label">FAQ</div>
            <h2 className="headline">Common questions.</h2>
          </div>
          <div className="faq-list fade-up d1">
            {[
              { q: 'Do my customers need a crypto wallet?', a: 'No. They open a link, pick card or crypto, and pay. No app install, no account, no wallet setup — ever.' },
              { q: 'What does Mistpay cost?', a: 'Free to create requests. 2% only when a payment is fulfilled. You pay nothing if the payer doesn\'t pay.' },
              { q: 'Which currencies can payers use?', a: 'Any. Cards and Apple Pay convert fiat to USDC automatically. Crypto payers can use a Tempo wallet or send USDC from another chain — the receiver always gets the exact amount.' },
              { q: 'How fast does money arrive?', a: 'Under a minute for crypto. Cross-border settlement as fast as sending a message — no wire delays, no correspondent banks.' },
              { q: 'Do I need to know anything about blockchain?', a: 'No. Mistpay runs on crypto rails behind the scenes. You see a dashboard. Your customers see a payment page. That\'s it.' },
              { q: 'What markets is this built for?', a: 'Businesses running on WhatsApp — especially in markets where payment gateways fail you and customers don\'t want to learn wallets.' },
            ].map(({ q, a }) => (
              <details className="faq-item" key={q}>
                <summary className="faq-q">{q}</summary>
                <p className="faq-a">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="cta-sect">
        <div className="container">
          <h2 className="display">The last payment tool<br />you&apos;ll ever need.</h2>
          <p className="body-l">Cross-border payments that feel local. No wire delays. No correspondent banks. From request to settled in under a minute.</p>
          <div className="magic-signin-wrap">
            <a className="btn btn-signal btn-lg" href="/dashboard">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M13 6l8 6-8 6" /></svg>
              Open dashboard
            </a>
            <p className="cta-note">Sign in with your phone · no seed phrase · no install</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mist-footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="row">
                <div className="mark ghost" style={{ '--sz': '30px' } as React.CSSProperties}><span className="g">M</span></div>
                <span className="word">MistPay</span>
              </div>
              <p>Pay. Request. Split. Done. Crypto rails behind the scenes so your customers never have to think about them.</p>
              <div className="footer-social">
                <a href={GITHUB_URL} target="_blank" rel="noreferrer" aria-label="MistPay on GitHub"><GithubIcon /></a>
                <a href={WHATSAPP_BOT_URL} target="_blank" rel="noreferrer" aria-label="Chat with the WhatsApp bot"><WhatsAppIcon /></a>
                <a href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer" aria-label="Chat with the Telegram bot"><TelegramIcon /></a>
              </div>
            </div>
            <div className="footer-col">
              <h4>Product</h4>
              <a href="#how-it-works">How it works</a>
              <a href="#requesters">For requesters</a>
              <a href="#payers">For payers</a>
              <a href="#technology">Technology</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div className="footer-col">
              <h4>Use cases</h4>
              <a href="#cta">Personal splits</a>
              <a href="#cta">Business invoicing</a>
              <a href="#cta">Freelancers</a>
              <a href="#cta">Group expenses</a>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <a href="#cta">About</a>
              <a href="#cta">Blog</a>
              <a href="#cta">Careers</a>
              <a href="#cta">Contact</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 MistPay · Built on Tempo</span>
            <div className="right">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Docs</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

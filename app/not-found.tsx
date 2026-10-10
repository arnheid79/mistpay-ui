import { MistWordmark } from '@/components/ui/logo'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-paper-2 flex flex-col items-center justify-center p-4 gap-6">
      <MistWordmark theme="light" href="/" />
      <div className="text-center space-y-2">
        <p
          className="text-display-2 text-ink-900"
          style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic' }}
        >
          404
        </p>
        <p className="text-body-m text-mist-400">This page doesn&apos;t exist.</p>
      </div>
      <Link
        href="/"
        className="text-sm text-signal-500 hover:text-signal-600 transition-colors"
      >
        ← Back to MistPay
      </Link>
    </div>
  )
}

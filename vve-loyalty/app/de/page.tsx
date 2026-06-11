import LandingFormDE from '@/components/LandingFormDE'

export default function HomePageDE() {
  return (
    <main className="min-h-screen bg-cream text-ink">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="border-b border-hairline">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 py-5 flex items-center justify-between">
          <a href="/de" className="inline-flex items-baseline font-serif tracking-tight">
            <span className="text-3xl text-ink leading-none">L</span>
            <span className="text-3xl text-honey leading-none">Y</span>
            <span className="ml-1.5 text-2xl text-muted leading-none">loyalty</span>
            <sup className="text-[10px] text-muted ml-0.5">®</sup>
          </a>
          <nav className="flex items-center gap-1 text-xs uppercase tracking-[0.12em] text-muted">
            <a href="/" className="px-2 py-1 hover:text-ink transition-colors">EN</a>
            <span className="text-hairline">·</span>
            <span className="px-2 py-1 text-ink font-medium">DE</span>
          </nav>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="border-b border-hairline">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 py-16 sm:py-24 lg:py-28">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-start">
            <div>
              <p className="inline-flex items-center gap-3 mb-8 text-sm sm:text-base font-medium text-honey-deep">
                <span className="w-8 h-px bg-honey" />
                Was Ketten machen — für unabhängige Betriebe.
                <span className="w-8 h-px bg-honey" />
              </p>
              <h1 className="font-serif text-[56px] sm:text-[76px] lg:text-[96px] leading-[0.98] tracking-[-0.025em] text-ink">
                Mach Laufkundschaft<br />
                zu <em className="italic text-honey">Stammgästen.</em>
              </h1>
              <p className="mt-10 text-xl sm:text-2xl leading-snug text-muted max-w-2xl">
                Ein kostenloses Treueprogramm für unabhängige Cafés und Restaurants in Berlin.
                <br className="hidden sm:block" />
                Du bestimmst die Regeln. Wir richten es ein.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-honey" /> Persönlich eingerichtet
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-honey" /> Kostenlos in der Pilotphase
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-honey" /> Made in Berlin
                </span>
              </div>
            </div>

            <div className="lg:pt-2">
              <LandingFormDE />
            </div>
          </div>
        </div>
      </section>

      {/* ── Product image ──────────────────────────────────────────────── */}
      <section className="border-b border-hairline">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 py-20 sm:py-28">
          <div className="flex flex-col items-center">
            <PhoneMockup />
            <p className="mt-10 text-center text-muted text-sm sm:text-base max-w-md">
              Alles in 5 Minuten eingerichtet — Farben, Stempel, Angebote, Kundenbindungs-Aktionen.
            </p>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <section className="border-b border-hairline">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 py-20 sm:py-28">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted mb-8 sm:mb-12">
            So funktioniert&apos;s
          </p>
          <div className="grid sm:grid-cols-3 gap-12 sm:gap-16">
            <Step number="01" title="Wir kommen vorbei" body="Ein persönlicher Termin bei dir im Café oder Restaurant. Etwa 30 Minuten." />
            <Step number="02" title="Wir richten alles ein" body="Dein Logo, deine Farben, deine Angebote — aufgebaut nach deiner Marke, während du zuschaust." />
            <Step number="03" title="Wir kümmern uns um den Rest" body="Kundenbindungs-Mails, Geburtstagsgeschenke, tägliche Berichte — alles läuft automatisch." />
          </div>
        </div>
      </section>

      {/* ── What you get ───────────────────────────────────────────────── */}
      <section className="border-b border-hairline">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 py-20 sm:py-28">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted mb-8 sm:mb-12">
            Was du bekommst
          </p>
          <div className="grid sm:grid-cols-2 gap-px bg-hairline rounded-2xl overflow-hidden">
            <Feature
              icon="📱"
              title="Täglicher Bericht aufs Handy"
              body="Eine kurze Zusammenfassung jeden Abend — wie der Tag lief, wer da war, worauf du morgen achten solltest."
            />
            <Feature
              icon="✉️"
              title="Automatische Kundenbindungs-Mails"
              body="Inaktive Gäste bekommen eine persönliche Nachricht von dir. Ganz automatisch, du musst nichts machen."
            />
            <Feature
              icon="🎂"
              title="Geburtstagsgeschenke"
              body="Überrasch deine Stammgäste zum Geburtstag mit einem Geschenk. Du wählst das Angebot — ein Kaffee, ein Gebäck, was auch immer."
            />
            <Feature
              icon="⚙️"
              title="Dein Laden, deine Regeln"
              body="Logo, Farben, Angebote, Kundenbindungs-Timing, Geburtstagsangebote — alles kannst du jederzeit selbst einstellen."
            />
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer>
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="inline-flex items-baseline font-serif tracking-tight">
            <span className="text-xl text-ink leading-none">L</span>
            <span className="text-xl text-honey leading-none">Y</span>
            <span className="ml-1 text-base text-muted leading-none">loyalty</span>
            <sup className="text-[9px] text-muted ml-0.5">®</sup>
          </p>
          <p className="text-xs text-muted">© 2026 LY Loyalty. Made in Berlin.</p>
        </div>
      </footer>
    </main>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function Step({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div>
      <p className="font-serif text-5xl text-honey leading-none">{number}</p>
      <h3 className="mt-6 font-medium text-2xl text-ink tracking-tight leading-snug">{title}</h3>
      <p className="mt-3 text-base text-muted leading-relaxed">{body}</p>
    </div>
  )
}

function Feature({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="bg-cream p-8 sm:p-10">
      <div className="text-4xl mb-6" aria-hidden>
        {icon}
      </div>
      <h3 className="font-medium text-2xl text-ink tracking-tight leading-snug">{title}</h3>
      <p className="mt-3 text-base text-muted leading-relaxed">{body}</p>
    </div>
  )
}

function PhoneMockup() {
  return (
    <div className="relative">
      <div className="w-[260px] sm:w-[280px] bg-ink rounded-[36px] p-2 shadow-[0_24px_48px_-16px_rgba(27,24,21,0.18)]">
        <div className="bg-white rounded-[28px] overflow-hidden">
          <div className="bg-ink h-5 flex items-center justify-center">
            <div className="w-16 h-1.5 bg-ink rounded-full" />
          </div>
          <div className="p-6 pt-7">
            <div className="text-center pb-5 border-b border-hairline">
              <p className="font-serif text-xl text-ink leading-tight">Café Lindenhof</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted mt-1">Treuekarte</p>
            </div>
            <p className="mt-5 text-sm text-ink">
              Hallo <span className="font-medium">Hanna</span>!
            </p>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-full flex items-center justify-center text-base ${
                    i < 6 ? 'bg-honey text-white' : 'bg-hairline/60 text-muted'
                  }`}
                >
                  ☕
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted text-center">
              <span className="text-ink font-medium">Noch 4</span> bis zu deinem Gratis-Kaffee
            </p>
            <div className="mt-5 bg-cream rounded-xl py-4 px-3">
              <div className="w-28 h-28 mx-auto bg-white border border-hairline rounded-lg p-1">
                <div className="w-full h-full grid grid-cols-7 gap-px">
                  {Array.from({ length: 49 }).map((_, i) => (
                    <div
                      key={i}
                      className={`${(i * 37 + 13) % 5 < 2 ? 'bg-ink' : 'bg-white'} rounded-[1px]`}
                    />
                  ))}
                </div>
              </div>
              <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-muted text-center">
                An der Kasse zeigen
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:block absolute -left-44 top-10 text-right">
        <span className="text-xs text-muted uppercase tracking-[0.15em]">Dein Logo</span>
        <div className="mt-1 ml-auto w-32 h-px bg-hairline" />
      </div>
      <div className="hidden lg:block absolute -right-44 top-40 text-left">
        <span className="text-xs text-muted uppercase tracking-[0.15em]">Dein Stempel</span>
        <div className="mt-1 w-32 h-px bg-hairline" />
      </div>
      <div className="hidden lg:block absolute -left-44 top-64 text-right">
        <span className="text-xs text-muted uppercase tracking-[0.15em]">Deine Farbe</span>
        <div className="mt-1 ml-auto w-32 h-px bg-hairline" />
      </div>
      <div className="hidden lg:block absolute -right-44 bottom-12 text-left">
        <span className="text-xs text-muted uppercase tracking-[0.15em]">Dein Angebot</span>
        <div className="mt-1 w-32 h-px bg-hairline" />
      </div>
    </div>
  )
}

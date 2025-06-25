import './globals.css'

export const metadata = {
  title: "MIDI Player Pro",
  description: "Advanced web-based MIDI player with file upload support. Play your MIDI files with professional controls and real-time visualization.",
  keywords: "MIDI, player, music, audio, web, upload, soundfont",
  authors: [{ name: "MIDI Player Pro" }],
  viewport: "width=device-width, initial-scale=1",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#3b82f6" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎹</text></svg>" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
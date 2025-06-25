export const metadata = {
    title: "MidiPlayer Pro",
    description: "Next.js MIDI player using MidiPlayerJS and Soundfont-player"
  }
  
  export default function RootLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    return (
      <html lang="en">
        <body>{children}</body>
      </html>
    )
  }
  
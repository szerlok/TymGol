import "./globals.css";

export const metadata = {
  title: "TymGol 2026",
  description: "Wyniki, terminarz i symulacje piłkarskich Mistrzostw Świata 2026"
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Archivo, Geist_Mono, Anton } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Heavy condensed display face for big headings (FIXTURES, scores, logo).
const anton = Anton({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "World Cup 2026 Prediction Game",
  description: "Predict scores and the knockout bracket — compete with colleagues.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${geistMono.variable} ${anton.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-cream text-ink">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}

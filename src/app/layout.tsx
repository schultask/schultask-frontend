import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, Playwrite_HR_Lijeva } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const displayFont = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

// Wordmark only — the "Schultask" logotype, not general headings.
const logoFont = Playwrite_HR_Lijeva({
  variable: "--font-logo",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Schultask",
  description: "Corporate learning & development platform",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${inter.variable} ${logoFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-body">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

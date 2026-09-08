import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "next-themes";
import { Sidebar } from "@/components/Sidebar";
import { AuthGuard } from "@/components/AuthGuard";
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "Automated Dataset Cleaner - Clean CSV Files Instantly",
  description: "Upload spreadsheets, remove duplicates, impute missing values, and standardize schemas. Production-ready data cleaning engine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/*
          ThemeProvider config:
          - attribute="class"  → writes class="dark" on <html>
          - defaultTheme="system" → respects OS preference on first visit
          - enableSystem → allows system preference detection
          suppressHydrationWarning on <html> prevents next-themes class mismatch warnings
        */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <AuthGuard>
              <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
                <Sidebar />
                <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                  <main className="flex-1 overflow-y-auto">
                    {children}
                  </main>
                </div>
              </div>
            </AuthGuard>
          </AuthProvider>
        </ThemeProvider>
        {/* Razorpay Checkout — loaded lazily to not block page */}
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}

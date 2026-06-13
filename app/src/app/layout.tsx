import Header from "@/components/layout/header";
import { LoadingLineProvider } from "@/components/layout/loading-line-provider";
import PwaRegister from "@/components/pwa-register";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { Metadata, Viewport } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Zen",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Zen",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/favicon.png",
    shortcut: "/icons/favicon.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#111111",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning className={`h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense fallback={null}>
            <LoadingLineProvider>
              <PwaRegister />
              <Header />
              {children}
              <Toaster position="bottom-center" />
            </LoadingLineProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}

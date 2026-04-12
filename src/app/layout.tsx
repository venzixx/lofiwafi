import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Our Space",
  description: "A private digital storeroom for us.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Our Space",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-[#050505] overflow-x-hidden relative`}>
        {/* Top Right Petal */}
        <div className="fixed -top-32 -right-32 w-[500px] h-[500px] opacity-40 mix-blend-screen pointer-events-none z-0">
           <img src="/floral-bg.png" alt="" className="w-full h-full object-cover rounded-full" />
        </div>
        
        {/* Bottom Left Petal */}
        <div className="fixed -bottom-32 -left-32 w-[500px] h-[500px] opacity-40 mix-blend-screen pointer-events-none z-0">
           <img src="/floral-bg.png" alt="" className="w-full h-full object-cover rounded-full" />
        </div>

        {/* Global Blur Layer */}
        <div className="fixed inset-0 backdrop-blur-[60px] pointer-events-none z-[1]" />

        <main className="relative min-h-screen w-full inset-0 z-10">
          {children}
        </main>
      </body>
    </html>
  );
}

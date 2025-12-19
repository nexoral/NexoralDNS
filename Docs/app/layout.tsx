import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NexoralDNS - Technical Documentation",
  description: "Advanced DNS Management & Surveillance System - Complete technical documentation for installation, configuration, and API reference.",
  keywords: ["DNS", "NexoralDNS", "DNS Management", "Network Security", "Documentation"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.NodeNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-gray-100`}
      >
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 lg:pl-72">
            <main className="min-h-screen">
              {children}
            </main>
            <Footer />
          </div>
        </div>
      </body>
    </html>
  );
}

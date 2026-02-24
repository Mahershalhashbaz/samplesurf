import type { Metadata } from "next";
import { Suspense } from "react";

import "@/app/globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "SampleSurf",
  description: "Local tracker for Amazon Influencer samples and purchases",
  icons: {
    icon: "/samplesurf-logo.png",
    shortcut: "/samplesurf-logo.png",
    apple: "/samplesurf-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={<div className="mx-auto w-full max-w-[1400px] p-6 text-sm text-slate1">Loading...</div>}>
          <AppShell>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}

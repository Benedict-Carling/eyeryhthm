import type { Metadata } from "next";
import { CalibrationProvider } from "../contexts/CalibrationContext";
import { SessionProvider } from "../contexts/SessionContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { ClientLayout } from "./client-layout";
import "@radix-ui/themes/styles.css";

export const metadata: Metadata = {
  title: "BlinkTrack",
  description:
    "Privacy-focused real-time eye movement tracking application that monitors blink patterns to detect fatigue and improve screen time awareness.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

// Script to set initial theme before React hydrates (prevents flash)
const themeScript = `
(function() {
  try {
    var theme = localStorage.getItem('theme');
    var isDark = theme === 'dark' ||
      (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.body.style.backgroundColor = isDark ? '#111113' : '#ffffff';
    document.documentElement.classList.add(isDark ? 'dark' : 'light');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <CalibrationProvider>
            <SessionProvider>
              <ClientLayout>{children}</ClientLayout>
            </SessionProvider>
          </CalibrationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

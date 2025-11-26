import type { Metadata } from "next";
import { CalibrationProvider } from "../contexts/CalibrationContext";
import { SessionProvider } from "../contexts/SessionContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { ClientLayout } from "./client-layout";
import "@radix-ui/themes/styles.css";

export const metadata: Metadata = {
  title: "BlinkTrack",
  description: "Eye movement tracking with camera",
  icons: {
    icon: [
      { url: "/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
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

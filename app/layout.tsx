import type { Metadata } from 'next';
import './globals.css';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'LPC - Lines Police CAD',
  description: "World's Leading Free-to-use service for Role-play communities",
  icons: {
    icon: '/static/images/lines-police-cad-discord-logo-2024-github-profile.png',
    apple: '/static/images/lines-police-cad-discord-logo-2024-github-profile.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ background: '#0a0a0f', width: '100%', height: '100%' }}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body style={{ background: '#0a0a0f', width: '100%', minHeight: '100%' }}>
        {/* Google tag (gtag.js) - beforeInteractive strategy injects into head */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-1L40PLRXWM"
          strategy="beforeInteractive"
        />
        <Script id="google-analytics" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-1L40PLRXWM');
          `}
        </Script>
        <Script id="cloudinary-config" strategy="beforeInteractive">
          {`
            window.CLOUDINARY_CLOUD_NAME = '${process.env.CLOUDINARY_CLOUD_NAME || ''}';
            window.CLOUDINARY_API_KEY = '${process.env.CLOUDINARY_API_KEY || ''}';
            window.CLOUDINARY_UPLOAD_PRESET = '${process.env.CLOUDINARY_UPLOAD_PRESET || ''}';
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}


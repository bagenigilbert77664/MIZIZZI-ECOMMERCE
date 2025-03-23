import { Html, Head, Main, NextScript } from "next/document"

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Preload critical fonts */}
        <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />

        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://upload.wikimedia.org" />

        {/* Add meta tags for better SEO and performance */}
        <meta name="theme-color" content="#ffffff" />
        <meta name="description" content="Mizizzi E-commerce - Shop the latest trends" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}


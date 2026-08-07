/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Genera un build autocontenido en .next/standalone, ideal para Docker
  // (imagen pequeña, arranca con `node server.js`, sin node_modules extra).
  output: "standalone",

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      // Galería servida desde Cloudinary.
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Fotos oficiales de jugadores del roster de Cloob.
      { protocol: "https", hostname: "dxzcf2hri9k06.cloudfront.net" },
    ],
  },

  // El dominio oficial es pmfl.com.pa. El antiguo pmflpanama.com redirige a él
  // (308 permanente) conservando la ruta, para no perder enlaces ni SEO.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "pmflpanama.com" }],
        destination: "https://pmfl.com.pa/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.pmflpanama.com" }],
        destination: "https://pmfl.com.pa/:path*",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
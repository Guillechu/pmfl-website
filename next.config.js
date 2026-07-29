/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
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
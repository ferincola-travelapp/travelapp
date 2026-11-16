import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    qualities: [75, 80, 85, 90, 95, 100],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/descargar/usuario',
        destination: 'https://firebasestorage.googleapis.com/v0/b/mvp-travelapp.firebasestorage.app/o/apks%2Ftravelapp-usuario.apk?alt=media&token=70b98484-96a1-4d63-b918-b34de9153fdb',
        permanent: false,
      },
      {
        source: '/descargar/conductor',
        destination: 'https://firebasestorage.googleapis.com/v0/b/mvp-travelapp.firebasestorage.app/o/apks%2Ftravelapp-conductor.apk?alt=media&token=9a248fe8-f5a9-411b-8828-ec5d5fd012b2',
        permanent: false,
      },
      {
        source: '/descargar/supervisor',
        destination: 'https://firebasestorage.googleapis.com/v0/b/mvp-travelapp.firebasestorage.app/o/apks%2Ftravelapp-supervisor.apk?alt=media&token=bb0c2ba9-adfe-42f7-8339-ea4872eaa207',
        permanent: false,
      },
      {
        source: '/apk/usuario',
        destination: 'https://firebasestorage.googleapis.com/v0/b/mvp-travelapp.firebasestorage.app/o/apks%2Ftravelapp-usuario.apk?alt=media&token=70b98484-96a1-4d63-b918-b34de9153fdb',
        permanent: false,
      },
      {
        source: '/apk/conductor',
        destination: 'https://firebasestorage.googleapis.com/v0/b/mvp-travelapp.firebasestorage.app/o/apks%2Ftravelapp-conductor.apk?alt=media&token=9a248fe8-f5a9-411b-8828-ec5d5fd012b2',
        permanent: false,
      },
      {
        source: '/apk/supervisor',
        destination: 'https://firebasestorage.googleapis.com/v0/b/mvp-travelapp.firebasestorage.app/o/apks%2Ftravelapp-supervisor.apk?alt=media&token=bb0c2ba9-adfe-42f7-8339-ea4872eaa207',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

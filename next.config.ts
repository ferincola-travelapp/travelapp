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
        destination: 'https://firebasestorage.googleapis.com/v0/b/mvp-travelapp.firebasestorage.app/o/apks%2Ftravelapp-usuario.apk?alt=media&token=37935279-e972-46f4-96ad-efc841a1c7ee',
        permanent: false,
      },
      {
        source: '/descargar/conductor',
        destination: 'https://firebasestorage.googleapis.com/v0/b/mvp-travelapp.firebasestorage.app/o/apks%2Ftravelapp-conductor.apk?alt=media&token=de915007-552a-4f06-88a4-a3ae6bcaea90',
        permanent: false,
      },
      {
        source: '/descargar/supervisor',
        destination: 'https://firebasestorage.googleapis.com/v0/b/mvp-travelapp.firebasestorage.app/o/apks%2Ftravelapp-supervisor.apk?alt=media&token=82a48a99-ee4e-4693-bbe3-9848c99d36cd',
        permanent: false,
      },
      {
        source: '/apk/usuario',
        destination: 'https://firebasestorage.googleapis.com/v0/b/mvp-travelapp.firebasestorage.app/o/apks%2Ftravelapp-usuario.apk?alt=media&token=37935279-e972-46f4-96ad-efc841a1c7ee',
        permanent: false,
      },
      {
        source: '/apk/conductor',
        destination: 'https://firebasestorage.googleapis.com/v0/b/mvp-travelapp.firebasestorage.app/o/apks%2Ftravelapp-conductor.apk?alt=media&token=de915007-552a-4f06-88a4-a3ae6bcaea90',
        permanent: false,
      },
      {
        source: '/apk/supervisor',
        destination: 'https://firebasestorage.googleapis.com/v0/b/mvp-travelapp.firebasestorage.app/o/apks%2Ftravelapp-supervisor.apk?alt=media&token=82a48a99-ee4e-4693-bbe3-9848c99d36cd',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

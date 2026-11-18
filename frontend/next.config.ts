import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Os dados mudam a cada viagem registrada, então nada é cacheado entre requisições.
  cacheComponents: false,
  partialPrefetching: false,
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;

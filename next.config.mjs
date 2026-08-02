/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // @supabase/supabase-js pulls in "ws" (and its optional native-binding
    // helpers) via its realtime client, even though this app never uses
    // realtime. These packages reference Node-only globals like __dirname
    // that don't exist in the Edge Runtime middleware runs on, crashing
    // every request. Stubbing them out here removes them from every bundle.
    config.resolve.alias = {
      ...config.resolve.alias,
      ws: false,
      bufferutil: false,
      "utf-8-validate": false,
    };
    return config;
  },
};

export default nextConfig;

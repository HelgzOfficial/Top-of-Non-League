/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // @supabase/supabase-js pulls in the Node "ws" package via its realtime
    // client, even though this app never uses realtime. "ws" references
    // Node-only globals (like __dirname) that don't exist in the Edge
    // Runtime middleware runs on, which crashes every request with
    // "ReferenceError: __dirname is not defined". This strips it from
    // the bundle entirely.
    config.resolve.fallback = { ...config.resolve.fallback, ws: false };
    return config;
  },
};

export default nextConfig;

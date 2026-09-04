/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: the whole page is prerendered at build time and the only
  // dynamic behaviour (the registration insert) runs in the browser. No server
  // actions, route handlers, or middleware -- any of those break `next build`
  // under `output: 'export'`.
  output: 'export',
}

export default nextConfig

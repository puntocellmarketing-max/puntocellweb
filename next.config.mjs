/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["puppeteer", "pdfkit"],
};

export default nextConfig;
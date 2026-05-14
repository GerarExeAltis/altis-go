const isProd = process.env.NODE_ENV === 'production';
const repo = 'altis-go';
const basePath = isProd ? `/${repo}` : '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
  assetPrefix: isProd ? `/${repo}/` : '',
  reactStrictMode: true,

  // Expoe basePath como env publica para que codigo de runtime (ex:
  // CSS mask-image em LogoAltis) consiga prefixar URLs de assets. O
  // <Image> do Next ja aplica basePath sozinho, mas CSS bruto nao.
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },

  // Em dev (npm run dev:lan), Next 15 bloqueia HMR/_next/* vindo de hosts
  // diferentes de localhost por padrao. Libera IPs/redes locais comuns para
  // permitir testar o fluxo totem -> celular pela LAN.
  allowedDevOrigins: [
    '192.168.0.0/16',
    '192.168.44.91',
    '10.0.0.0/8',
    '172.16.0.0/12',
    '*.local',
  ],
};

export default nextConfig;

// PM2 config for the Next.js frontend on the VPS.
// Copied into each release by scripts/deploy-frontend.ps1; started from
// /var/www/assuredrewards/web/current.
module.exports = {
  apps: [
    {
      name: "assuredrewards-web",
      cwd: "/var/www/assuredrewards/web/current",
      script: "server.js",
      exec_mode: "fork",
      instances: 1,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "127.0.0.1",
        // Server-side rendering talks to the backend directly (no public round trip).
        API_INTERNAL_URL: "http://127.0.0.1:5000",
        BACKEND_URL: "http://127.0.0.1:5000",
      },
    },
  ],
};

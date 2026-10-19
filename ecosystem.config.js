const path = require("path");

const ROOT = __dirname;

module.exports = {
  apps: [
    {
      name: "absensi-backend",
      cwd: path.join(ROOT, "backend"),
      script: "dist/src/main.js",
      node_args: "--enable-source-maps",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "400M",
      out_file: path.join(ROOT, "logs", "absensi-backend.out.log"),
      error_file: path.join(ROOT, "logs", "absensi-backend.err.log"),
      time: true,
    },
    {
      name: "absensi-frontend",
      cwd: path.join(ROOT, "frontend"),
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      max_memory_restart: "400M",
      out_file: path.join(ROOT, "logs", "absensi-frontend.out.log"),
      error_file: path.join(ROOT, "logs", "absensi-frontend.err.log"),
      time: true,
    },
  ],
};

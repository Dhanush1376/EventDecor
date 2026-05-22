module.exports = {
  apps: [
    {
      name: 'siri-arts-backend',
      script: './dist/server.js',
      instances: 'max', // Use all available CPUs in cluster mode
      exec_mode: 'cluster',
      autorestart: true,
      watch: false, // Do not watch in production
      max_memory_restart: '800M', // Graceful restart if memory exceeds 800MB (preventing 90%+ crashes)
      env: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      // Graceful shutdown settings
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 50000,
    }
  ]
};

module.exports = {
  apps: [
    {
      name: 'siri-arts-backend',
      script: './dist/server.js',
      instances: 'max', // Enable cluster mode to maximize CPU utilization
      exec_mode: 'cluster',
      autorestart: true,
      watch: false, // Do not watch in production
      max_memory_restart: '800M', // Graceful restart if memory exceeds 800MB (preventing 90%+ crashes)
      node_args: '--max-old-space-size=768',
      env: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'warn',
      },
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      // Graceful shutdown settings
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};

module.exports = {
  apps: [
    {
      name: 'sharevault-api',
      script: 'server.js',
      cwd: '/var/www/projects/sharevault/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
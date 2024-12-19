export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
    username: process.env.POSTGRES_USER || 'spacehub',
    password: process.env.POSTGRES_PASSWORD || 'spacehub_dev_password',
    database: process.env.POSTGRES_DB || 'spacehub',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  },
  streaming: {
    platforms: [
      'twitch',
      'youtube',
      'facebook',
      'tiktok',
      'trovo',
      'kick'
    ]
  }
});

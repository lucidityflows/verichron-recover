import { registerAs } from '@nestjs/config';

export default registerAs('mongodb', () => ({
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/communications',
  options: {
    maxPoolSize: 50,
    minPoolSize: 10,
    maxIdleTimeMS: 30000,
    retryWrites: true,
    w: 'majority',
  },
}));
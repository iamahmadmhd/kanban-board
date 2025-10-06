import { createClient } from 'redis';

type RedisClientType = ReturnType<typeof createClient>;

let redisClient: RedisClientType | null = null;
let isConnecting = false;

export const getRedis = async (): Promise<RedisClientType> => {
    // Return existing connected client
    if (redisClient?.isOpen) {
        return redisClient;
    }

    // Wait if another call is currently connecting
    if (isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
        return getRedis();
    }

    // Create and connect new client
    isConnecting = true;

    try {
        redisClient = createClient({
            url: process.env.REDIS_URL!,
        });

        redisClient.on('error', err => {
            console.error('Redis Client Error:', err);
        });

        redisClient.on('disconnect', () => {
            console.info('Redis client disconnected');
        });

        await redisClient.connect();
        console.info('Redis client connected');

        return redisClient;
    } finally {
        isConnecting = false;
    }
};

// Graceful shutdown helper
export const disconnectRedis = async () => {
    if (redisClient?.isOpen) {
        await redisClient.quit();
        redisClient = null;
    }
};

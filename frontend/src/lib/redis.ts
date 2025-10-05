import { createClient } from 'redis';

export const getRedis = async () => {
    const client = createClient({
        url: process.env.REDIS_URL!,
    });

    client.on('error', function (err) {
        throw err;
    });
    await client.connect();
    return client;
};

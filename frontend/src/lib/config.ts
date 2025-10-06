export const config = {
    sessionTtl: parseInt(process.env.SESSION_TTL_SECONDS || '604800', 10), // 7 days default
    tokenRefreshBuffer: parseInt(process.env.TOKEN_REFRESH_BUFFER_SECONDS || '300', 10), // 5 min default
};

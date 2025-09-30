const tsJestTransform = {
    '^.+\\.(ts|tsx|js|jsx)$': 'ts-jest',
};

/** @type {import('jest').Config} */
export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: tsJestTransform,
    transformIgnorePatterns: [
        '/node_modules/(?!(uuid)/)', // do not ignore uuid
    ],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    setupFiles: ['<rootDir>/env.js'],
};

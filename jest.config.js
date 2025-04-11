/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/iceplant_portal/frontend/setupTests.ts'],
  testMatch: [
    '**/?(*.)+(test).[tj]s?(x)'
  ],
  globals: {
    'ts-jest': {
      tsconfig: 'iceplant_portal/frontend/tsconfig.app.json',
    },
  },
};
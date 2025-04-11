/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  rootDir: ".",
  testEnvironment: "jsdom",
  moduleDirectories: ["node_modules", "<rootDir>/node_modules"],
  setupFilesAfterEnv: ["<rootDir>/setupTests.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {}],
  },
};
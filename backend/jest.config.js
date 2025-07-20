// jest.config.js - CORREGIDO
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$', // ✅ Solo testRegex, sin testMatch
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    // ✅ Solo archivos de src/ que importan
    'src/**/*.(t|j)s',
    
    // ❌ Excluir archivos que no necesitamos testear
    '!src/**/*.spec.ts',           // Tests
    '!src/**/*.interface.ts',      // Interfaces
    '!src/**/*.module.ts',         // Módulos de NestJS
    '!src/**/*.dto.ts',            // DTOs (solo tipos)
    '!src/main.ts',                // Entrada de la app
    '!src/**/*.d.ts',              // Archivos de definición
    '!src/config/**',              // Configuraciones
    '!src/**/interfaces/**',       // Interfaces
    '!src/domain/repositories/**', // Solo interfaces/abstracciones
    '!src/domain/services/**',     // Solo interfaces
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  
  // ✅ CORREGIDO: moduleNameMapping → moduleNameMapper
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  
  // ✅ Excluir completamente carpetas innecesarias
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/generated/',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/generated/',
    '/prisma/',
  ],
  
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
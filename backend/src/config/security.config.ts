export interface SecurityConfig {
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    max: number;
  };
  helmet: {
    enabled: boolean;
  };
  cors: {
    origins: string[];
  };
}

export const getSecurityConfig = (): SecurityConfig => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    rateLimit: {
      enabled: isProduction, // ✅ Solo en producción
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // 100 requests por ventana
    },
    helmet: {
      enabled: isProduction, // ✅ Solo en producción
    },
    cors: {
      origins: isProduction 
        ? ['https://your-domain.com']
        : ['http://localhost:3000', 'http://localhost:3001'],
    },
  };
};

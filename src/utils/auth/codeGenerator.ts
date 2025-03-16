import { randomBytes } from 'crypto';

export interface CodeGeneratorOptions {
  length?: number;
  charset?: 'numeric' | 'alphanumeric' | 'alphabetic';
  ttl?: number;
}

const DEFAULT_OPTIONS: Required<CodeGeneratorOptions> = {
  length: 6,
  charset: 'numeric',
  ttl: 300, // 5 minutes
};

const CHARSETS = {
  numeric: '0123456789',
  alphanumeric: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  alphabetic: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
} as const;

type GeneratedCode = {
  code: string;
  expiresAt: Date;
  ttl: number;
};

export function generateCode(options: CodeGeneratorOptions = {}): GeneratedCode {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const charset = CHARSETS[config.charset];
  
  const bytes = randomBytes(config.length);
  let code = '';
  for (let i = 0; i < config.length; i++) {
    code += charset[bytes[i] % charset.length];
  }
  
  const expiresAt = new Date(Date.now() + config.ttl * 1000);
  
  return {
    code,
    expiresAt,
    ttl: config.ttl,
  };
}

export function isCodeExpired(expiresAt: Date): boolean {
  return Date.now() > expiresAt.getTime();
}

export function isValidCodeFormat(code: string, options: CodeGeneratorOptions = {}): boolean {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const charset = CHARSETS[config.charset];
  
  if (code.length !== config.length) {
    return false;
  }
  
  return code.split('').every(char => charset.includes(char));
} 
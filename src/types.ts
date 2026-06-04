export type RiskLevel = 'safe' | 'moderate' | 'high' | 'critical';

export interface RiskScore {
  overall: number;
  breakdown: {
    existence: number;
    popularity: number;
    scripts: number;
    vulnerabilities: number;
    age: number;
  };
}

export interface PackageInfo {
  name: string;
  version?: string;
  exists: boolean;
  registry?: string;
  downloads?: string;
  hasScripts: boolean;
  scriptTypes?: string[];
  vulnerabilities?: {
    count: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  age?: {
    years: number;
    active: boolean;
    lastUpdate: string;
  };
  maintainers?: {
    name: string;
    email?: string;
  }[];
  repository?: {
    type: 'git';
    url: string;
  };
  keywords?: string[];
  deprecated?: boolean;
}

export interface CheckResult {
  package: string;
  version?: string;
  riskScore: RiskScore;
  riskLevel: RiskLevel;
  checks: {
    exists: boolean;
    registry?: string;
    popularity: {
      downloads: string;
      score: number;
    };
    scripts: {
      hasScripts: boolean;
      scriptTypes: string[];
    };
    vulnerabilities: {
      count: number;
      critical: number;
      high: number;
    };
    age: {
      years: number;
      active: boolean;
      lastUpdate: string;
    };
  };
  recommendation: 'install' | 'review' | 'block';
  timestamp: string;
}

export interface Config {
  riskThresholds: {
    block: number;
    warn: number;
    autoApprove: number;
  };
  checks: {
    slopsquat: boolean;
    typosquat: boolean;
    scripts: boolean;
    cve: boolean;
  };
  allowList: string[];
  blockList: string[];
  registries: {
    npm: string;
    pip: string;
    github: string;
  };
  customRules?: CustomRule[];
}

export interface CustomRule {
  name: string;
  pattern: string;
  weight: number;
  message: string;
}
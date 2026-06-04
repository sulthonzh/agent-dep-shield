import { PackageAnalyzer } from '../analyzer';
import { Config } from '../types';

const mockConfig: Config = {
  riskThresholds: {
    block: 80,
    warn: 60,
    autoApprove: 40
  },
  checks: {
    slopsquat: true,
    typosquat: true,
    scripts: true,
    cve: true
  },
  allowList: [],
  blockList: [],
  registries: {
    npm: 'https://registry.npmjs.org',
    pip: 'https://pypi.org/simple',
    github: 'https://github.com'
  }
};

describe('PackageAnalyzer', () => {
  let analyzer: PackageAnalyzer;

  beforeEach(() => {
    analyzer = new PackageAnalyzer(mockConfig);
  });

  describe('calculateRiskScore', () => {
    it('should give low score to popular, existing packages without scripts', () => {
      const packageInfo = {
        name: 'express',
        exists: true,
        registry: 'npm',
        downloads: '81M',
        hasScripts: false,
        scriptTypes: [],
        vulnerabilities: { count: 0, critical: 0, high: 0, medium: 0, low: 0 },
        age: { years: 5, active: true, lastUpdate: '2021-01-01T00:00:00.000Z' }
      };

      const riskScore = analyzer.calculateRiskScore(packageInfo);
      expect(riskScore.overall).toBeLessThan(30);
      expect(riskScore.breakdown.existence).toBe(30);
      expect(riskScore.breakdown.scripts).toBe(0);
    });

    it('should give high score to non-existent packages', () => {
      const packageInfo = {
        name: 'nonexistent-package',
        exists: false,
        hasScripts: false,
        scriptTypes: []
      };

      const riskScore = analyzer.calculateRiskScore(packageInfo);
      expect(riskScore.overall).toBe(100);
      expect(riskScore.breakdown.existence).toBe(100);
    });

    it('should give medium score to packages with scripts', () => {
      const packageInfo = {
        name: 'package-with-scripts',
        exists: true,
        registry: 'npm',
        downloads: '1K',
        hasScripts: true,
        scriptTypes: ['postinstall'],
        vulnerabilities: { count: 0, critical: 0, high: 0 },
        age: { years: 1, active: true, lastUpdate: new Date().toISOString() }
      };

      const riskScore = analyzer.calculateRiskScore(packageInfo);
      expect(riskScore.breakdown.scripts).toBe(25);
      expect(riskScore.overall).toBeGreaterThan(20);
    });
  });

  describe('calculatePopularityScore', () => {
    it('should give low score for packages with high downloads', () => {
      const score = analyzer['calculatePopularityScore']('81M');
      expect(score).toBeLessThan(10);
    });

    it('should give medium score for packages with moderate downloads', () => {
      const score = analyzer['calculatePopularityScore']('100K');
      expect(score).toBeGreaterThan(5);
      expect(score).toBeLessThan(20);
    });

    it('should give neutral score for unknown downloads', () => {
      const score = analyzer['calculatePopularityScore']('unknown');
      expect(score).toBe(50);
    });
  });

  describe('calculateVulnerabilityScore', () => {
    it('should give high score for packages with critical vulnerabilities', () => {
      const vulns = { count: 2, critical: 1, high: 0 };
      const score = analyzer['calculateVulnerabilityScore'](vulns);
      expect(score).toBeGreaterThan(40);
    });

    it('should give low score for packages without vulnerabilities', () => {
      const vulns = { count: 0, critical: 0, high: 0 };
      const score = analyzer['calculateVulnerabilityScore'](vulns);
      expect(score).toBe(0);
    });
  });

  describe('calculateAgeScore', () => {
    it('should give low score for old packages', () => {
      const age = { years: 5, active: true };
      const score = analyzer['calculateAgeScore'](age);
      expect(score).toBe(0);
    });

    it('should give high score for new packages', () => {
      const age = { years: 1, active: true };
      const score = analyzer['calculateAgeScore'](age);
      expect(score).toBe(15);
    });

    it('should give lower score for inactive packages', () => {
      const age = { years: 3, active: false };
      const score = analyzer['calculateAgeScore'](age);
      expect(score).toBeGreaterThan(15);
    });
  });
});
import { ConfigManager } from '../config';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

describe('ConfigManager', () => {
  let testConfigPath: string;
  let originalConfigPath: string;

  beforeEach(() => {
    testConfigPath = join(__dirname, 'test-config.json');
  });

  afterEach(() => {
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
  });

  describe('loadConfig', () => {
    it('should load default config when no config file exists', () => {
      const configManager = new ConfigManager(testConfigPath);
      const config = configManager.getConfig();
      
      expect(config.riskThresholds.block).toBe(80);
      expect(config.riskThresholds.warn).toBe(60);
      expect(config.riskThresholds.autoApprove).toBe(40);
      expect(config.checks.slopsquat).toBe(true);
      expect(config.allowList).toEqual([]);
    });

    it('should merge user config with default config', () => {
      // Create a test config file
      const userConfig = {
        riskThresholds: {
          block: 90,
          warn: 70
        },
        allowList: ['express', 'react']
      };
      writeFileSync(testConfigPath, JSON.stringify(userConfig));

      const configManager = new ConfigManager(testConfigPath);
      const config = configManager.getConfig();
      
      expect(config.riskThresholds.block).toBe(90);
      expect(config.riskThresholds.warn).toBe(70);
      expect(config.riskThresholds.autoApprove).toBe(40); // Default value preserved
      expect(config.allowList).toEqual(['express', 'react']);
      expect(config.checks.slopsquat).toBe(true); // Default value preserved
    });
  });

  describe('validateConfig', () => {
    it('should pass validation for valid config', () => {
      const configManager = new ConfigManager(testConfigPath);
      const errors = configManager.validateConfig();
      expect(errors).toHaveLength(0);
    });

    it('should detect invalid risk thresholds', () => {
      const invalidConfig = {
        riskThresholds: {
          block: 150, // Invalid
          warn: 60,
          autoApprove: 40
        }
      };
      writeFileSync(testConfigPath, JSON.stringify(invalidConfig));

      const configManager = new ConfigManager(testConfigPath);
      const errors = configManager.validateConfig();
      expect(errors).toContain('Block threshold must be between 0 and 100');
    });

    it('should detect invalid threshold ordering', () => {
      const invalidConfig = {
        riskThresholds: {
          block: 30,
          warn: 60, // Invalid: warn > block
          autoApprove: 40
        }
      };
      writeFileSync(testConfigPath, JSON.stringify(invalidConfig));

      const configManager = new ConfigManager(testConfigPath);
      const errors = configManager.validateConfig();
      expect(errors).toContain('Warn threshold must be less than block threshold');
    });

    it('should validate custom rules', () => {
      const invalidConfig = {
        customRules: [
          {
            name: 'test-rule',
            pattern: 'test',
            weight: 150 // Invalid weight
          }
        ]
      };
      writeFileSync(testConfigPath, JSON.stringify(invalidConfig));

      const configManager = new ConfigManager(testConfigPath);
      const errors = configManager.validateConfig();
      expect(errors).toContain('Custom rule test-rule: weight must be between 0 and 100');
    });
  });

  describe('shouldAllow/shouldBlock', () => {
    beforeEach(() => {
      const configData = {
        allowList: ['express', 'react'],
        blockList: ['eval', 'dangerous-pkg']
      };
      writeFileSync(testConfigPath, JSON.stringify(configData));
    });

    it('should return true for packages in allow list', () => {
      const configManager = new ConfigManager(testConfigPath);
      expect(configManager.shouldAllow('express')).toBe(true);
      expect(configManager.shouldAllow('react')).toBe(true);
      expect(configManager.shouldAllow('lodash')).toBe(false);
    });

    it('should return true for packages in block list', () => {
      const configManager = new ConfigManager(testConfigPath);
      expect(configManager.shouldBlock('eval')).toBe(true);
      expect(configManager.shouldBlock('dangerous-pkg')).toBe(true);
      expect(configManager.shouldBlock('lodash')).toBe(false);
    });
  });

  describe('custom rules management', () => {
    it('should add custom rules', () => {
      const configManager = new ConfigManager(testConfigPath);
      const rule = {
        name: 'no-crypto',
        pattern: 'crypto.*',
        weight: 90,
        message: 'Crypto packages require approval'
      };
      
      configManager.addCustomRule(rule);
      const config = configManager.getConfig();
      expect(config.customRules).toHaveLength(1);
      expect(config.customRules![0]).toEqual(rule);
    });

    it('should remove custom rules', () => {
      const configManager = new ConfigManager(testConfigPath);
      const rule = {
        name: 'no-crypto',
        pattern: 'crypto.*',
        weight: 90,
        message: 'Crypto packages require approval'
      };
      
      configManager.addCustomRule(rule);
      configManager.removeCustomRule('no-crypto');
      const config = configManager.getConfig();
      expect(config.customRules).toHaveLength(0);
    });
  });
});
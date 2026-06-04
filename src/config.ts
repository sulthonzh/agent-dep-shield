import fs from 'fs';
import path from 'path';
import { Config, CustomRule } from './types';

const DEFAULT_CONFIG: Config = {
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
  blockList: ['eval', 'dangerous-pkg', 'evil-package'],
  registries: {
    npm: 'https://registry.npmjs.org',
    pip: 'https://pypi.org/simple',
    github: 'https://github.com'
  }
};

export class ConfigManager {
  private configPath: string;
  private config: Config;

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), 'shield-config.json');
    this.config = this.loadConfig();
  }

  private loadConfig(): Config {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf-8');
        const userConfig = JSON.parse(configData);
        return this.mergeConfig(DEFAULT_CONFIG, userConfig);
      }
    } catch (error) {
      console.warn(`Warning: Could not load config file ${this.configPath}:`, error);
    }
    
    return DEFAULT_CONFIG;
  }

  private mergeConfig(defaultConfig: Config, userConfig: any): Config {
    const merged = { ...defaultConfig };
    
    // Merge risk thresholds
    if (userConfig.riskThresholds) {
      merged.riskThresholds = { ...merged.riskThresholds, ...userConfig.riskThresholds };
    }
    
    // Merge checks
    if (userConfig.checks) {
      merged.checks = { ...merged.checks, ...userConfig.checks };
    }
    
    // Merge lists (concatenate, remove duplicates)
    if (userConfig.allowList) {
      merged.allowList = [...new Set([...merged.allowList, ...userConfig.allowList])];
    }
    
    if (userConfig.blockList) {
      merged.blockList = [...new Set([...merged.blockList, ...userConfig.blockList])];
    }
    
    // Merge registries
    if (userConfig.registries) {
      merged.registries = { ...merged.registries, ...userConfig.registries };
    }
    
    // Add custom rules if they exist
    if (userConfig.customRules) {
      merged.customRules = userConfig.customRules;
    }
    
    return merged;
  }

  getConfig(): Config {
    return this.config;
  }

  saveConfig(config?: Config): void {
    const finalConfig = config || this.config;
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(finalConfig, null, 2));
    } catch (error) {
      throw new Error(`Failed to save config: ${error}`);
    }
  }

  validateConfig(): string[] {
    const errors: string[] = [];
    const config = this.getConfig();

    // Validate risk thresholds
    if (config.riskThresholds.block < 0 || config.riskThresholds.block > 100) {
      errors.push('Block threshold must be between 0 and 100');
    }
    
    if (config.riskThresholds.warn < 0 || config.riskThresholds.warn > 100) {
      errors.push('Warn threshold must be between 0 and 100');
    }
    
    if (config.riskThresholds.autoApprove < 0 || config.riskThresholds.autoApprove > 100) {
      errors.push('Auto-approve threshold must be between 0 and 100');
    }

    // Validate threshold ordering
    if (config.riskThresholds.autoApprove >= config.riskThresholds.warn) {
      errors.push('Auto-approve threshold must be less than warn threshold');
    }
    
    if (config.riskThresholds.warn >= config.riskThresholds.block) {
      errors.push('Warn threshold must be less than block threshold');
    }

    // Validate custom rules
    if (config.customRules) {
      config.customRules.forEach((rule, index) => {
        if (!rule.name || !rule.pattern || typeof rule.weight !== 'number') {
          errors.push(`Custom rule ${index}: missing required fields (name, pattern, weight)`);
        }
        
        if (rule.weight < 0 || rule.weight > 100) {
          errors.push(`Custom rule ${rule.name}: weight must be between 0 and 100`);
        }
      });
    }

    return errors;
  }

  shouldAllow(packageName: string): boolean {
    return this.config.allowList.includes(packageName);
  }

  shouldBlock(packageName: string): boolean {
    return this.config.blockList.includes(packageName);
  }

  addCustomRule(rule: CustomRule): void {
    if (!this.config.customRules) {
      this.config.customRules = [];
    }
    this.config.customRules.push(rule);
  }

  removeCustomRule(ruleName: string): void {
    if (this.config.customRules) {
      this.config.customRules = this.config.customRules.filter(rule => rule.name !== ruleName);
    }
  }

  getConfigPath(): string {
    return this.configPath;
  }
}
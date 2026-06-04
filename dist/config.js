"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DEFAULT_CONFIG = {
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
class ConfigManager {
    configPath;
    config;
    constructor(configPath) {
        this.configPath = configPath || path_1.default.join(process.cwd(), 'shield-config.json');
        this.config = this.loadConfig();
    }
    loadConfig() {
        try {
            if (fs_1.default.existsSync(this.configPath)) {
                const configData = fs_1.default.readFileSync(this.configPath, 'utf-8');
                const userConfig = JSON.parse(configData);
                return this.mergeConfig(DEFAULT_CONFIG, userConfig);
            }
        }
        catch (error) {
            console.warn(`Warning: Could not load config file ${this.configPath}:`, error);
        }
        return DEFAULT_CONFIG;
    }
    mergeConfig(defaultConfig, userConfig) {
        const merged = { ...defaultConfig };
        if (userConfig.riskThresholds) {
            merged.riskThresholds = { ...merged.riskThresholds, ...userConfig.riskThresholds };
        }
        if (userConfig.checks) {
            merged.checks = { ...merged.checks, ...userConfig.checks };
        }
        if (userConfig.allowList) {
            merged.allowList = [...new Set([...merged.allowList, ...userConfig.allowList])];
        }
        if (userConfig.blockList) {
            merged.blockList = [...new Set([...merged.blockList, ...userConfig.blockList])];
        }
        if (userConfig.registries) {
            merged.registries = { ...merged.registries, ...userConfig.registries };
        }
        if (userConfig.customRules) {
            merged.customRules = userConfig.customRules;
        }
        return merged;
    }
    getConfig() {
        return this.config;
    }
    saveConfig(config) {
        const finalConfig = config || this.config;
        try {
            fs_1.default.writeFileSync(this.configPath, JSON.stringify(finalConfig, null, 2));
        }
        catch (error) {
            throw new Error(`Failed to save config: ${error}`);
        }
    }
    validateConfig() {
        const errors = [];
        const config = this.getConfig();
        if (config.riskThresholds.block < 0 || config.riskThresholds.block > 100) {
            errors.push('Block threshold must be between 0 and 100');
        }
        if (config.riskThresholds.warn < 0 || config.riskThresholds.warn > 100) {
            errors.push('Warn threshold must be between 0 and 100');
        }
        if (config.riskThresholds.autoApprove < 0 || config.riskThresholds.autoApprove > 100) {
            errors.push('Auto-approve threshold must be between 0 and 100');
        }
        if (config.riskThresholds.autoApprove >= config.riskThresholds.warn) {
            errors.push('Auto-approve threshold must be less than warn threshold');
        }
        if (config.riskThresholds.warn >= config.riskThresholds.block) {
            errors.push('Warn threshold must be less than block threshold');
        }
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
    shouldAllow(packageName) {
        return this.config.allowList.includes(packageName);
    }
    shouldBlock(packageName) {
        return this.config.blockList.includes(packageName);
    }
    addCustomRule(rule) {
        if (!this.config.customRules) {
            this.config.customRules = [];
        }
        this.config.customRules.push(rule);
    }
    removeCustomRule(ruleName) {
        if (this.config.customRules) {
            this.config.customRules = this.config.customRules.filter(rule => rule.name !== ruleName);
        }
    }
    getConfigPath() {
        return this.configPath;
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=config.js.map
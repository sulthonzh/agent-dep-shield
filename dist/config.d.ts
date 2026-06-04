import { Config, CustomRule } from './types';
export declare class ConfigManager {
    private configPath;
    private config;
    constructor(configPath?: string);
    private loadConfig;
    private mergeConfig;
    getConfig(): Config;
    saveConfig(config?: Config): void;
    validateConfig(): string[];
    shouldAllow(packageName: string): boolean;
    shouldBlock(packageName: string): boolean;
    addCustomRule(rule: CustomRule): void;
    removeCustomRule(ruleName: string): void;
    getConfigPath(): string;
}
//# sourceMappingURL=config.d.ts.map
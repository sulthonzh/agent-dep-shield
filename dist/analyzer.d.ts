import { Config, PackageInfo, RiskScore } from './types';
export declare class PackageAnalyzer {
    private config;
    private cache;
    constructor(config: Config);
    analyzePackage(packageName: string, version?: string): Promise<PackageInfo>;
    private checkNpmPackage;
    private getNpmInfo;
    private yearsFromNow;
    calculateRiskScore(info: PackageInfo): RiskScore;
    private calculatePopularityScore;
    private calculateAgeScore;
    clearCache(): void;
}
//# sourceMappingURL=analyzer.d.ts.map
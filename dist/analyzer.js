"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageAnalyzer = void 0;
const undici_1 = require("undici");
class PackageAnalyzer {
    config;
    cache = new Map();
    constructor(config) {
        this.config = config;
    }
    async analyzePackage(packageName, version) {
        const cacheKey = `${packageName}@${version || 'latest'}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        try {
            const info = {
                name: packageName,
                version: version || undefined,
                exists: false,
                hasScripts: false,
                scriptTypes: []
            };
            const npmExists = await this.checkNpmPackage(packageName);
            if (npmExists.exists) {
                info.exists = true;
                info.registry = 'npm';
                Object.assign(info, await this.getNpmInfo(packageName));
            }
            this.cache.set(cacheKey, info);
            return info;
        }
        catch (error) {
            return {
                name: packageName,
                version: version || undefined,
                exists: false,
                hasScripts: false,
                scriptTypes: []
            };
        }
    }
    async checkNpmPackage(packageName) {
        try {
            const response = await (0, undici_1.fetch)(`https://registry.npmjs.org/${packageName}`);
            return { exists: response.ok };
        }
        catch {
            return { exists: false };
        }
    }
    async getNpmInfo(packageName) {
        try {
            const response = await (0, undici_1.fetch)(`https://registry.npmjs.org/${packageName}`);
            if (!response.ok)
                return {};
            const data = await response.json();
            return {
                downloads: data.downloads?.toString() || 'unknown',
                hasScripts: !!data.scripts,
                scriptTypes: Object.keys(data.scripts || []),
                age: {
                    years: this.yearsFromNow(data.date || data.time),
                    active: (data.maintainers && data.maintainers.length > 0) || false,
                    lastUpdate: (data.date || data.time || new Date().toISOString())
                }
            };
        }
        catch {
            return {};
        }
    }
    yearsFromNow(dateString) {
        if (!dateString)
            return 1;
        const date = new Date(dateString);
        const now = new Date();
        const timeDiff = now.getTime() - date.getTime();
        return Math.floor(timeDiff / (1000 * 3600 * 24 * 365));
    }
    calculateRiskScore(info) {
        const breakdown = {
            existence: info.exists ? 30 : 100,
            popularity: this.calculatePopularityScore(info.downloads),
            scripts: info.hasScripts ? 25 : 0,
            vulnerabilities: 0,
            age: this.calculateAgeScore(info.age)
        };
        const overall = Math.round(Object.values(breakdown).reduce((sum, score, index) => {
            const weights = [0.3, 0.2, 0.25, 0.15, 0.1];
            return sum + (score * weights[index]);
        }, 0));
        return {
            overall: Math.min(100, Math.max(0, overall)),
            breakdown
        };
    }
    calculatePopularityScore(downloads) {
        if (!downloads || downloads === 'unknown')
            return 50;
        if (downloads.includes('M') || downloads.includes('K')) {
            const num = parseFloat(downloads.replace(/[^0-9.]/g, ''));
            if (downloads.includes('M')) {
                return num > 10 ? 0 : Math.round(20 - (num * 2));
            }
            else if (downloads.includes('K')) {
                return num > 100 ? 0 : Math.round(20 - (num / 5));
            }
        }
        const num = parseInt(downloads);
        if (num > 1000000)
            return 0;
        if (num > 100000)
            return 5;
        if (num > 10000)
            return 10;
        if (num > 1000)
            return 15;
        return 20;
    }
    calculateAgeScore(age) {
        if (!age)
            return 10;
        let score = 0;
        if (age.years > 5)
            score = 0;
        else if (age.years > 2)
            score = 5;
        else if (age.years > 1)
            score = 10;
        else
            score = 15;
        if (!age.active)
            score += 20;
        return Math.min(25, score);
    }
    clearCache() {
        this.cache.clear();
    }
}
exports.PackageAnalyzer = PackageAnalyzer;
//# sourceMappingURL=analyzer.js.map
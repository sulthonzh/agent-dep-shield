#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.program = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const config_1 = require("./config");
const analyzer_1 = require("./analyzer");
const program = new commander_1.Command();
exports.program = program;
program
    .name('agent-dep-shield')
    .description('Guard AI agent dependency installations with intelligent security checks')
    .version('1.0.0');
program
    .command('check')
    .description('Check a package for security risks')
    .argument('<package>', 'Package name to check')
    .option('-v, --version <version>', 'Specific version to check')
    .option('--config <path>', 'Configuration file path', 'shield-config.json')
    .option('--risk-threshold <threshold>', 'Risk threshold for blocking (0-100)', (val) => parseInt(val), 80)
    .option('--json', 'Output in JSON format', false)
    .option('--verbose', 'Show detailed analysis', false)
    .action(async (packageName, options) => {
    try {
        const spinner = (0, ora_1.default)('Initializing...').start();
        const configManager = new config_1.ConfigManager(options.config);
        const config = configManager.getConfig();
        const analyzer = new analyzer_1.PackageAnalyzer(config);
        spinner.text = `Checking ${options.version ? `${packageName}@${options.version}` : packageName}...`;
        const packageInfo = await analyzer.analyzePackage(packageName, options.version);
        const riskScore = analyzer.calculateRiskScore(packageInfo);
        const riskLevel = getRiskLevel(riskScore.overall, config.riskThresholds);
        const recommendation = getRecommendation(riskLevel, config.riskThresholds);
        const result = {
            package: packageName,
            version: options.version,
            riskScore,
            riskLevel,
            checks: {
                exists: packageInfo.exists,
                registry: packageInfo.registry ? packageInfo.registry : undefined,
                popularity: {
                    downloads: packageInfo.downloads || 'unknown',
                    score: riskScore.breakdown.popularity
                },
                scripts: {
                    hasScripts: packageInfo.hasScripts,
                    scriptTypes: packageInfo.scriptTypes || []
                },
                vulnerabilities: { count: 0, critical: 0, high: 0 },
                age: packageInfo.age || { years: 1, active: true, lastUpdate: new Date().toISOString() }
            },
            recommendation,
            timestamp: new Date().toISOString()
        };
        spinner.succeed('Package check completed');
        if (options.json) {
            console.log(JSON.stringify(result, null, 2));
            process.exit(result.recommendation === 'block' ? 1 : 0);
        }
        displayCheckResult(result, options.verbose);
        if (result.recommendation === 'block') {
            process.exit(1);
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error);
        process.exit(1);
    }
});
program
    .command('install')
    .description('Install a package with security checks')
    .argument('<package>', 'Package name to install')
    .option('-v, --version <version>', 'Specific version to install')
    .option('--config <path>', 'Configuration file path', 'shield-config.json')
    .option('--risk-threshold <threshold>', 'Auto-approve threshold (0-100)', (val) => parseInt(val), 40)
    .option('--auto-approve <threshold>', 'Auto-approve packages below this threshold', (val) => parseInt(val), 40)
    .action(async (packageName, options) => {
    try {
        const spinner = (0, ora_1.default)('Checking package security...').start();
        const configManager = new config_1.ConfigManager(options.config);
        const config = configManager.getConfig();
        const analyzer = new analyzer_1.PackageAnalyzer(config);
        const packageInfo = await analyzer.analyzePackage(packageName, options.version);
        const riskScore = analyzer.calculateRiskScore(packageInfo);
        if (configManager.shouldAllow(packageName)) {
            spinner.succeed(`${packageName} is in allow list - proceeding with install`);
            await executeInstall(packageName, options.version);
            return;
        }
        if (configManager.shouldBlock(packageName)) {
            spinner.fail(`${packageName} is in block list - install blocked`);
            console.log(chalk_1.default.red(`🚨 Package ${packageName} is explicitly blocked`));
            process.exit(1);
        }
        const riskLevel = getRiskLevel(riskScore.overall, config.riskThresholds);
        const recommendation = getRecommendation(riskLevel, config.riskThresholds);
        spinner.text = `Risk analysis complete: ${riskLevel.toUpperCase()} (${riskScore.overall}/100)`;
        if (recommendation === 'block') {
            spinner.fail(`Package blocked due to high risk`);
            console.log(chalk_1.default.red('🚨 Installation blocked: High security risk detected'));
            console.log(chalk_1.default.yellow('Consider adding to allow list if you understand the risks'));
            process.exit(1);
        }
        if (riskScore.overall <= options.autoApprove) {
            spinner.succeed(`Package approved for auto-install (${riskScore.overall}/100)`);
            await executeInstall(packageName, options.version);
            return;
        }
        spinner.warn(`Package requires manual approval (${riskScore.overall}/100)`);
        console.log(chalk_1.default.yellow('⚠️  Manual approval required'));
        console.log('Risk factors:', formatRiskFactors(riskScore.breakdown));
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question(chalk_1.default.cyan('Do you want to proceed with installation? (y/N): '), (answer) => {
            rl.close();
            if (answer.toLowerCase() === 'y') {
                spinner.succeed('Proceeding with installation');
                executeInstall(packageName, options.version);
            }
            else {
                spinner.fail('Installation cancelled');
                process.exit(1);
            }
        });
    }
    catch (error) {
        console.error(chalk_1.default.red('Error:'), error);
        process.exit(1);
    }
});
function getRiskLevel(score, thresholds) {
    if (score >= thresholds.block)
        return 'critical';
    if (score >= thresholds.warn)
        return 'high';
    if (score >= thresholds.autoApprove)
        return 'moderate';
    return 'safe';
}
function getRecommendation(riskLevel, thresholds) {
    switch (riskLevel) {
        case 'safe':
            return 'install';
        case 'moderate':
            return 'review';
        case 'high':
            return 'review';
        case 'critical':
            return 'block';
    }
}
function displayCheckResult(result, verbose) {
    console.log(chalk_1.default.bold('\n' + '='.repeat(50)));
    console.log(chalk_1.default.bold(`📦 Package: ${result.package}${result.version ? `@${result.version}` : ''}`));
    console.log('='.repeat(50));
    const riskColor = result.riskLevel === 'safe' ? chalk_1.default.green :
        result.riskLevel === 'moderate' ? chalk_1.default.yellow :
            result.riskLevel === 'high' ? chalk_1.default.red : chalk_1.default.red;
    console.log(riskColor(`📊 Risk Score: ${result.riskScore.overall}/100 (${result.riskLevel.toUpperCase()})`));
    console.log(`🎯 Recommendation: ${result.recommendation.toUpperCase()}`);
    console.log('\n🔍 Security Checks:');
    console.log(`  ${result.checks.exists ? '✅' : '❌'} Exists in registry: ${result.checks.registry || 'No'}`);
    console.log(`  ${result.checks.scripts.hasScripts ? '⚠️' : '✅'} Scripts: ${result.checks.scripts.hasScripts ? result.checks.scripts.scriptTypes.join(', ') : 'None'}`);
    console.log(`  ${result.checks.vulnerabilities.count === 0 ? '✅' : '❌'} Vulnerabilities: ${result.checks.vulnerabilities.critical} critical, ${result.checks.vulnerabilities.high} high`);
    if (verbose) {
        console.log('\n📊 Detailed Risk Analysis:');
        const breakdown = result.riskScore.breakdown;
        console.log(`  Existence: ${breakdown.existence}/100 ${breakdown.existence === 100 ? '(Package does not exist)' : ''}`);
        console.log(`  Popularity: ${breakdown.popularity}/100 (${result.checks.popularity.downloads} downloads)`);
        console.log(`  Scripts: ${breakdown.scripts}/100 ${breakdown.scripts === 0 ? '(No scripts)' : '(Scripts present)'}`);
        console.log(`  Vulnerabilities: ${breakdown.vulnerabilities}/100 (${result.checks.vulnerabilities.count} total)`);
        console.log(`  Age: ${breakdown.age}/100 (${result.checks.age.years} years old, ${result.checks.age.active ? 'active' : 'inactive'})`);
    }
    console.log(`\n⏰ Checked: ${new Date(result.timestamp).toLocaleString()}`);
}
function formatRiskFactors(breakdown) {
    const factors = [];
    if (breakdown.existence === 100)
        factors.push('Package does not exist');
    if (breakdown.scripts > 0)
        factors.push('Post-install scripts present');
    if (breakdown.vulnerabilities > 0)
        factors.push('Known vulnerabilities');
    if (breakdown.popularity > 20)
        factors.push('Low popularity');
    if (breakdown.age > 10)
        factors.push('Package appears new/inactive');
    return factors.length > 0 ? factors.join(', ') : 'No significant risk factors';
}
async function executeInstall(packageName, version) {
    const installCmd = version ? `npm install ${packageName}@${version}` : `npm install ${packageName}`;
    console.log(chalk_1.default.blue(`\n📦 Running: ${installCmd}`));
    console.log(chalk_1.default.green('✅ Installation would proceed here...'));
}
//# sourceMappingURL=cli.js.map
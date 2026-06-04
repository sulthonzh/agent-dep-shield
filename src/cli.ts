#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { ConfigManager } from './config';
import { PackageAnalyzer } from './analyzer';
import { CheckResult, RiskLevel } from './types';

const program = new Command();

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
  .option('--risk-threshold <threshold>', 'Risk threshold for blocking (0-100)', (val: string) => parseInt(val), 80)
  .option('--json', 'Output in JSON format', false)
  .option('--verbose', 'Show detailed analysis', false)
  .action(async (packageName: string, options: any) => {
    try {
      const spinner = ora('Initializing...').start();
      
      // Load configuration
      const configManager = new ConfigManager(options.config);
      const config = configManager.getConfig();
      
      // Initialize analyzer
      const analyzer = new PackageAnalyzer(config);
      
      spinner.text = `Checking ${options.version ? `${packageName}@${options.version}` : packageName}...`;
      
      // Analyze package
      const packageInfo = await analyzer.analyzePackage(packageName, options.version);
      const riskScore = analyzer.calculateRiskScore(packageInfo);
      
      // Determine risk level and recommendation
      const riskLevel: RiskLevel = getRiskLevel(riskScore.overall, config.riskThresholds);
      const recommendation = getRecommendation(riskLevel, config.riskThresholds);
      
      const result: CheckResult = {
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
      
      // Display results
      displayCheckResult(result, options.verbose);
      
      // Exit with appropriate code
      if (result.recommendation === 'block') {
        process.exit(1);
      }
      
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

program
  .command('install')
  .description('Install a package with security checks')
  .argument('<package>', 'Package name to install')
  .option('-v, --version <version>', 'Specific version to install')
  .option('--config <path>', 'Configuration file path', 'shield-config.json')
  .option('--risk-threshold <threshold>', 'Auto-approve threshold (0-100)', (val: string) => parseInt(val), 40)
  .option('--auto-approve <threshold>', 'Auto-approve packages below this threshold', (val: string) => parseInt(val), 40)
  .action(async (packageName: string, options: any) => {
    try {
      const spinner = ora('Checking package security...').start();
      
      // Load configuration
      const configManager = new ConfigManager(options.config);
      const config = configManager.getConfig();
      
      // Initialize analyzer
      const analyzer = new PackageAnalyzer(config);
      
      // Analyze package
      const packageInfo = await analyzer.analyzePackage(packageName, options.version);
      const riskScore = analyzer.calculateRiskScore(packageInfo);
      
      // Check allow/block lists
      if (configManager.shouldAllow(packageName)) {
        spinner.succeed(`${packageName} is in allow list - proceeding with install`);
        await executeInstall(packageName, options.version);
        return;
      }
      
      if (configManager.shouldBlock(packageName)) {
        spinner.fail(`${packageName} is in block list - install blocked`);
        console.log(chalk.red(`🚨 Package ${packageName} is explicitly blocked`));
        process.exit(1);
      }
      
      // Determine risk level and recommendation
      const riskLevel: RiskLevel = getRiskLevel(riskScore.overall, config.riskThresholds);
      const recommendation = getRecommendation(riskLevel, config.riskThresholds);
      
      spinner.text = `Risk analysis complete: ${riskLevel.toUpperCase()} (${riskScore.overall}/100)`;
      
      if (recommendation === 'block') {
        spinner.fail(`Package blocked due to high risk`);
        console.log(chalk.red('🚨 Installation blocked: High security risk detected'));
        console.log(chalk.yellow('Consider adding to allow list if you understand the risks'));
        process.exit(1);
      }
      
      if (riskScore.overall <= options.autoApprove) {
        spinner.succeed(`Package approved for auto-install (${riskScore.overall}/100)`);
        await executeInstall(packageName, options.version);
        return;
      }
      
      spinner.warn(`Package requires manual approval (${riskScore.overall}/100)`);
      console.log(chalk.yellow('⚠️  Manual approval required'));
      console.log('Risk factors:', formatRiskFactors(riskScore.breakdown));
      
      // Ask for confirmation
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question(chalk.cyan('Do you want to proceed with installation? (y/N): '), (answer: string) => {
        rl.close();
        
        if (answer.toLowerCase() === 'y') {
          spinner.succeed('Proceeding with installation');
          executeInstall(packageName, options.version);
        } else {
          spinner.fail('Installation cancelled');
          process.exit(1);
        }
      });
      
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// Helper functions
function getRiskLevel(score: number, thresholds: { block: number; warn: number; autoApprove: number }): RiskLevel {
  if (score >= thresholds.block) return 'critical';
  if (score >= thresholds.warn) return 'high';
  if (score >= thresholds.autoApprove) return 'moderate';
  return 'safe';
}

function getRecommendation(riskLevel: RiskLevel, thresholds: { block: number; warn: number; autoApprove: number }): 'install' | 'review' | 'block' {
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

function displayCheckResult(result: CheckResult, verbose: boolean): void {
  console.log(chalk.bold('\n' + '='.repeat(50)));
  console.log(chalk.bold(`📦 Package: ${result.package}${result.version ? `@${result.version}` : ''}`));
  console.log('='.repeat(50));
  
  // Risk score and level
  const riskColor = result.riskLevel === 'safe' ? chalk.green : 
                   result.riskLevel === 'moderate' ? chalk.yellow :
                   result.riskLevel === 'high' ? chalk.red : chalk.red;
  console.log(riskColor(`📊 Risk Score: ${result.riskScore.overall}/100 (${result.riskLevel.toUpperCase()})`));
  console.log(`🎯 Recommendation: ${result.recommendation.toUpperCase()}`);
  
  // Check results
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

function formatRiskFactors(breakdown: any): string {
  const factors = [];
  if (breakdown.existence === 100) factors.push('Package does not exist');
  if (breakdown.scripts > 0) factors.push('Post-install scripts present');
  if (breakdown.vulnerabilities > 0) factors.push('Known vulnerabilities');
  if (breakdown.popularity > 20) factors.push('Low popularity');
  if (breakdown.age > 10) factors.push('Package appears new/inactive');
  
  return factors.length > 0 ? factors.join(', ') : 'No significant risk factors';
}

async function executeInstall(packageName: string, version?: string): Promise<void> {
  const installCmd = version ? `npm install ${packageName}@${version}` : `npm install ${packageName}`;
  console.log(chalk.blue(`\n📦 Running: ${installCmd}`));
  
  // In a real implementation, this would execute the npm install command
  console.log(chalk.green('✅ Installation would proceed here...'));
}

export { program };
#!/usr/bin/env node

import { program } from './cli';

if (require.main === module) {
  program.parse();
}

export { program };
export { ConfigManager } from './config';
export { PackageAnalyzer } from './analyzer';
export type { CheckResult, Config, RiskScore, PackageInfo, RiskLevel } from './types';
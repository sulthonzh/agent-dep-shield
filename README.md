# Agent Dep Shield

[![CI](https://github.com/sulthonzh/agent-dep-shield/actions/workflows/ci.yml/badge.svg)](https://github.com/sulthonzh/agent-dep-shield/actions/workflows/ci.yml)
[![NPM Version](https://img.shields.io/npm/v/agent-dep-shield.svg)](https://www.npmjs.com/package/agent-dep-shield)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Guard AI agent dependency installations** - Intercept and validate npm/pip packages before AI agents install them, preventing slopsquatting, typosquatting, and supply chain attacks.

## The Problem

AI coding agents (Claude Code, Cursor, Copilot, Codex) routinely suggest and install packages without security verification:

- **Slopsquatting**: Attackers register packages that AI models hallucinate
- **Typosquatting**: AI agents typo package names at scale  
- **Post-install scripts**: #1 attack vector — agents run `npm install` blindly
- 86% of repos have packages with known vulnerabilities
- Average detection time for compromised package: 209 days

## Solution

Agent Dep Shield intercepts package installations with intelligent security checks:

### 🚨 Pre-Install Protection
- **Risk Scoring**: 0-100 score based on multiple security factors
- **Block/Allow Logic**: Configurable thresholds for automatic blocking
- **Audit Trail**: All decisions logged for security review

### 🔍 Smart Detection
- **Slopsquat Detection**: Validates package existence against top registries
- **Typosquat Detection**: Edit distance analysis against popular packages
- **Script Detection**: Flags packages with postinstall/preinstall hooks
- **CVE Scanning**: Checks for known vulnerabilities

### 🔌 Multiple Interfaces
- **CLI**: Direct command-line usage
- **MCP Server**: Native integration with AI agents
- **Git Hook**: Pre-commit protection
- **CI Integration**: GitHub Action and GitLab CI support

## Installation

```bash
npm install -g agent-dep-shield
```

Or use directly with npx:

```bash
npx agent-dep-shield check <package-name>
```

## Quick Start

### 1. Basic Package Check

```bash
# Check a single package
npx agent-dep-shield check express

# Check with custom threshold
npx agent-dep-shield check express --risk-threshold 70

# Multiple packages
npx agent-dep-shield check express react lodash
```

### 2. Intercept npm install

```bash
# Intercept package installation
npx agent-dep-shield install express

# With automatic approval below threshold
npx agent-dep-shield install express --auto-approve 50

# Block risky packages
npx agent-dep-shield install express --block-high-risk
```

### 3. Wrap npm install (Guard Mode)

```bash
# Intercept all npm installs in current session
npx agent-dep-shield guard

# Guard with specific configuration
npx agent-dep-shield guard --config ./shield-config.json
```

## Configuration

Create `shield-config.json`:

```json
{
  "riskThresholds": {
    "block": 80,
    "warn": 60,
    "autoApprove": 40
  },
  "checks": {
    "slopsquat": true,
    "typosquat": true,
    "scripts": true,
    "cve": true
  },
  "allowList": ["express", "react", "lodash"],
  "blockList": ["eval", "dangerous-pkg"],
  "registries": {
    "npm": "https://registry.npmjs.org",
    "pip": "https://pypi.org/simple"
  }
}
```

## Usage Patterns

### CLI Mode

```bash
# Check package before installation
npx agent-dep-shield check <package>

# Install with security checks
npx agent-dep-shield install <package>

# Guard mode - intercept all package operations
npx agent-dep-shield guard

# MCP server mode
npx agent-dep-shield mcp-server
```

### MCP Integration

```json
{
  "mcpServers": {
    "dependency_check": {
      "command": "npx",
      "args": ["agent-dep-shield", "mcp-server"]
    }
  }
}
```

### Git Hook

```bash
# Pre-commit hook
git config hooks.dependency-check "$(which agent-dep-shield) check"

# Or in .git/hooks/pre-commit:
#!/bin/sh
agent-dep-shield check $(git diff --cached --name-only --diff-filter=AM | grep -E 'package\.json$|requirements\.txt$' | xargs -I{} sh -c 'cat {} | grep -E "\"[^\"]+\"|\"[^\"]+\"' | grep -E '^[^:]+:[0-9]+:' | awk -F: '{print $2}' | sed 's/["",]//g')
```

## Risk Scoring

### Risk Factors (0-100 scale)

| Factor | Weight | Description |
|--------|--------|-------------|
| Package Existence | 30 | Does package exist in official registry? |
| Popularity | 20 | Download count and community trust |
| Script Presence | 25 | Has postinstall/preinstall scripts |
| Vulnerability History | 15 | CVE history and security track record |
| Age | 10 | Package age and maintenance status |

### Risk Levels

- **0-40**: Safe (Green) ✅
- **41-70**: Moderate (Yellow) ⚠️
- **71-80**: High (Orange) 🟠
- **81-100**: Critical (Red) 🔴

## Examples

### Safe Package Check
```bash
$ npx agent-dep-shield check express

📦 Checking express...
✅ Package exists in npm registry
✅ 81M+ weekly downloads (high popularity)
✅ No postinstall scripts
✅ Active maintenance (5 years)
📊 Risk Score: 15/100 (SAFE)
✅ Installation recommended
```

### Risky Package Check
```bash
$ npx agent-dep-shield check express-hack

📦 Checking express-hack...
⚠️ Package exists but suspicious name
⚠️ Only 23 downloads (low popularity)
⚠️ Contains postinstall scripts
📊 Risk Score: 85/100 (CRITICAL)
🚨 BLOCKED: High risk detected
❌ Installation blocked
```

## Output Formats

### JSON Output
```json
{
  "package": "express",
  "riskScore": 15,
  "riskLevel": "safe",
  "checks": {
    "exists": true,
    "popularity": { "score": 20, "downloads": "81M+" },
    "scripts": false,
    "vulnerabilities": [],
    "age": { "years": 5, "active": true }
  },
  "recommendation": "install",
  "timestamp": "2026-06-05T03:47:00Z"
}
```

### Text Output
```
📦 Package: express
📊 Risk Score: 15/100 (SAFE)
✅ Exists in npm registry
✅ 81M+ weekly downloads
✅ No suspicious scripts
✅ Active maintenance
🎯 Recommendation: INSTALL
```

## Advanced Features

### Custom Rules

```json
{
  "customRules": [
    {
      "name": "no-crypto-packages",
      "pattern": "crypto.*",
      "weight": 90,
      "message": "Crypto packages require special approval"
    }
  ]
}
```

### Team Policies

```json
{
  "policies": {
    "devDependencies": {
      "maxRisk": 50,
      "allowScripts": false
    },
    "production": {
      "maxRisk": 30,
      "requireVetApproval": true
    }
  }
}
```

## Integration

### GitHub Action

```yaml
name: Dependency Security Check
on: [pull_request]

jobs:
  security-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm install -g agent-dep-shield
      - name: Check dependencies
        run: |
          agent-dep-shield check $(cat package.json | grep -E "\"[^\"]+\"" | awk -F'"' '{print $2}')
```

### CI Pipeline Integration

```bash
# In your CI script
echo "🔍 Running dependency security check..."
agent-dep-shield guard --ci-mode

# Check before install
if agent-dep-shield check react --risk-threshold 50; then
  npm install react
else
  echo "❌ React package blocked due to security concerns"
  exit 1
fi
```

## API

### Programmatic Usage

```javascript
import { AgentDepShield } from 'agent-dep-shield';

const shield = new AgentDepShield();

// Check a package
const result = await shield.check('express');
console.log(result.riskScore);
console.log(result.recommendation);

// Install with checks
await shield.install('express', { autoApprove: 40 });
```

## Development

```bash
git clone https://github.com/sulthonzh/agent-dep-shield.git
cd agent-dep-shield
npm install
npm run build
npm test
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Security

Agent Dep Shield is designed to be security-first:

- ✅ Zero dependencies for security isolation
- ✅ Local-only analysis (no data sent to servers)
- ✅ Configurable control over risk thresholds
- ✅ Comprehensive audit logging

## Acknowledgments

- Based on research from Aikido.dev slopsquatting reports
- Microsoft "Mini Shai-Hulud" campaign analysis
- AI Coding Guild dependency security guidelines

---

**Agent Dep Shield** - Protecting AI agents from dependency attacks
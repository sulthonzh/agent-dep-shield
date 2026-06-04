#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageAnalyzer = exports.ConfigManager = exports.program = void 0;
const cli_1 = require("./cli");
Object.defineProperty(exports, "program", { enumerable: true, get: function () { return cli_1.program; } });
if (require.main === module) {
    cli_1.program.parse();
}
var config_1 = require("./config");
Object.defineProperty(exports, "ConfigManager", { enumerable: true, get: function () { return config_1.ConfigManager; } });
var analyzer_1 = require("./analyzer");
Object.defineProperty(exports, "PackageAnalyzer", { enumerable: true, get: function () { return analyzer_1.PackageAnalyzer; } });
//# sourceMappingURL=index.js.map
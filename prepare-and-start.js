const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const archive = path.join(__dirname, 'neon-arcade-runtime.tar.gz');
if (!fs.existsSync(archive)) throw new Error('Missing NEON ARCADE runtime archive');
execFileSync('tar', ['-xzf', archive, '-C', __dirname], { stdio: 'inherit' });
require(path.join(__dirname, 'server.js'));

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function parseBool(value, fallback = false) {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'y', 'on'].includes(String(value).toLowerCase());
}

function parseNumber(value, fallback = null) {
  if (value == null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseArgv(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      out._.push(token);
      continue;
    }
    const eqIndex = token.indexOf('=');
    if (eqIndex > -1) {
      const key = token.slice(2, eqIndex);
      out[key] = token.slice(eqIndex + 1);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function loadEnv(cwd) {
  const moduleRoot = path.resolve(__dirname, '..');
  const envCandidates = [path.join(moduleRoot, '.env')];
  if (path.resolve(cwd) !== path.resolve(moduleRoot)) envCandidates.unshift(path.join(cwd, '.env'));

  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      break;
    }
  }
}

function getConfig() {
  const cwd = process.cwd();
  loadEnv(cwd);
  const args = parseArgv(process.argv.slice(2));

  const usersArg = args.users || process.env.BOT_USERS || '';
  const users = String(usersArg)
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

  return {
    command: args._[0] || 'run',
    apiBaseUrl: args['api-base-url'] || process.env.API_BASE_URL || 'http://127.0.0.1:4000/api/v1',
    socketUrl: args['socket-url'] || process.env.SOCKET_URL || 'http://127.0.0.1:4000',
    users,
    password: args.password || process.env.BOT_PASSWORD || '',
    privateCode: args['private-code'] || process.env.PRIVATE_CODE || '',
    protoId: args['proto-id'] || process.env.POKER_PROTO_ID || '',
    minBet: parseNumber(args['min-bet'] ?? process.env.POKER_MIN_BET, null),
    protoIndex: parseNumber(args['proto-index'] ?? process.env.POKER_PROTO_INDEX, 0),
    task: args.task || process.env.TASK || 'auto-check-call-fold',
    roundsTarget: parseNumber(args.rounds ?? process.env.ROUNDS_TARGET, null),
    durationMs: parseNumber(args['duration-ms'] ?? process.env.RUN_DURATION_MS, 120000),
    staggerMs: parseNumber(args['stagger-ms'] ?? process.env.STAGGER_MS, 350),
    actionDelayMs: parseNumber(args['action-delay-ms'] ?? process.env.ACTION_DELAY_MS, 250),
    logEvents: parseBool(args['log-events'] ?? process.env.LOG_EVENTS, false),
    scriptPath: args.script || process.env.SCRIPT_PATH || '',
    help: Boolean(args.help),
  };
}

module.exports = { getConfig };

const { getConfig } = require('./config');
const { runBots } = require('./lib/taskRunner');
const { createLogger } = require('./lib/logger');

function printHelp() {
  console.log(`
Game-BotTester (standalone)

Usage:
  node src/cli.js run [options]

Options:
  --users test1,test2,test3
  --password Test1234!
  --task observe|auto-check-call-fold|fold-first-opportunity|scripted-actions
  --rounds 6                   (task-specific; e.g. fold-first-opportunity per-hand target)
  --proto-id <mongo-id>
  --min-bet <number>
  --proto-index <number>    (default 0)
  --private-code <code>
  --duration-ms <ms>        (default 120000)
  --stagger-ms <ms>         (default 350)
  --action-delay-ms <ms>    (default 250)
  --script <path-to-json>   (for scripted-actions task)
  --log-events              (verbose socket event logging)

Examples:
  node src/cli.js run --users test1,test2,test3 --password Test1234! --task observe --min-bet 5
  node src/cli.js run --users test1,test2,test3 --password Test1234! --task fold-first-opportunity --rounds 6 --min-bet 5
  node src/cli.js run --users test1,test2,test3 --password Test1234! --task scripted-actions --script ./tasks/example-script.json --min-bet 5
`);
}

async function main() {
  const config = getConfig();
  if (config.help || config.command === 'help') {
    printHelp();
    return;
  }
  if (config.command !== 'run') {
    throw new Error(`Unknown command: ${config.command}`);
  }

  const logger = createLogger('bot-runner');
  await runBots(config, logger);
}

main().catch(error => {
  console.error(new Date().toISOString(), '[bot-runner]', 'fatal:', error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exit(1);
});

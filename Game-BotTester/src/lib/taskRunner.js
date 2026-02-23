const fs = require('fs');
const path = require('path');
const { BackendApi } = require('./backendApi');
const { BotClient } = require('./botClient');
const { sleep } = require('./sleep');
const { getTaskFactory } = require('../tasks');

async function withShutdown(handler) {
  let shuttingDown = false;
  const wrap = async signal => {
    if (shuttingDown) return;
    shuttingDown = true;
    await handler(signal);
  };
  process.on('SIGINT', () => wrap('SIGINT'));
  process.on('SIGTERM', () => wrap('SIGTERM'));
}

function loadScriptFile(scriptPath) {
  if (!scriptPath) return null;
  let resolved = scriptPath;
  if (!path.isAbsolute(resolved)) {
    const cwdResolved = path.resolve(process.cwd(), resolved);
    const moduleResolved = path.resolve(__dirname, '..', '..', resolved);
    resolved = fs.existsSync(cwdResolved) ? cwdResolved : moduleResolved;
  }
  const raw = fs.readFileSync(resolved, 'utf8');
  return { path: resolved, data: JSON.parse(raw) };
}

async function runBots(config, logger) {
  if (!config.users.length) throw new Error('No users provided. Set BOT_USERS or pass --users test1,test2,test3');
  if (!config.password) throw new Error('No password provided. Set BOT_PASSWORD or pass --password');

  const api = new BackendApi({ apiBaseUrl: config.apiBaseUrl, logger: logger.child('api') });
  const scriptBundle = loadScriptFile(config.scriptPath);
  const taskFactory = getTaskFactory(config.task);

  logger.info('task=', config.task, 'users=', config.users.join(','), 'durationMs=', config.durationMs);
  if (scriptBundle) logger.info('script=', scriptBundle.path);

  const bots = config.users.map(username => {
    return new BotClient({
      username,
      password: config.password,
      api,
      socketUrl: config.socketUrl,
      logger: logger.child(username),
      logEvents: config.logEvents,
      actionDelayMs: config.actionDelayMs,
    });
  });

  await withShutdown(async signal => {
    logger.warn(`shutdown requested (${signal})`);
    for (const bot of bots) bot.disconnect();
    process.exit(0);
  });

  for (const bot of bots) {
    await bot.login();
  }

  // Prevent join-limit buildup by clearing any stale active table before a new run.
  for (const bot of bots) {
    try {
      await api.leaveBoard({ authorization: bot.authorization });
      logger.info(`pre-run leaveBoard ok: ${bot.username}`);
    } catch (error) {
      logger.info(`pre-run leaveBoard skipped: ${bot.username} (${error.message})`);
    }
  }

  let targetBoardId = null;
  let selectedProto = null;
  const maxJoinMatchAttempts = 8;

  for (let i = 0; i < bots.length; i += 1) {
    const bot = bots[i];
    let joinResult;
    for (let attempt = 1; attempt <= maxJoinMatchAttempts; attempt += 1) {
      joinResult = await bot.joinTableViaApi({
        privateCode: config.privateCode || undefined,
        protoId: selectedProto?._id || config.protoId || undefined,
        minBet: selectedProto ? undefined : config.minBet,
        protoIndex: config.protoIndex,
      });

      if (joinResult?.proto) selectedProto = joinResult.proto;
      if (!targetBoardId) {
        targetBoardId = bot.boardId;
        break;
      }

      if (`${bot.boardId}` === `${targetBoardId}`) break;

      logger.warn(
        `join mismatch for ${bot.username}: got ${bot.boardId}, expected ${targetBoardId} (attempt ${attempt}/${maxJoinMatchAttempts})`
      );
      try {
        await api.leaveBoard({ authorization: bot.authorization });
      } catch (error) {
        logger.info(`mismatch leaveBoard skipped: ${bot.username} (${error.message})`);
      }
      if (attempt === maxJoinMatchAttempts) {
        throw new Error(`Bots landed on different boards (${targetBoardId} vs ${bot.boardId}) after ${maxJoinMatchAttempts} retries.`);
      }
      await sleep(config.staggerMs);
    }

    await sleep(config.staggerMs);
    await bot.connectSocketAndJoinBoard();
    await sleep(config.staggerMs);
  }

  logger.info(`all bots joined board ${targetBoardId}`);

  const completedBots = new Set();
  let resolveAllTasksComplete;
  const allTasksComplete = new Promise(resolve => {
    resolveAllTasksComplete = resolve;
  });
  let earlyStopReason = null;
  for (const bot of bots) {
    bot.on('taskComplete', payload => {
      completedBots.add(bot.username);
      logger.info(`task complete: ${bot.username}`, payload || {});
      if (completedBots.size === bots.length) resolveAllTasksComplete();
    });
    bot.on('spiderFailure', failure => {
      if (earlyStopReason) return;
      if (failure?.kind !== 'hand-stall-timeout') return;
      earlyStopReason = { bot: bot.username, failure };
      logger.warn(`early stop requested by spider failure from ${bot.username}`, failure);
      resolveAllTasksComplete();
    });
  }

  const taskContexts = bots.map(bot => {
    const ctx = {
      bot,
      bots,
      config,
      logger: logger.child(`task:${bot.username}`),
      script: scriptBundle?.data || null,
    };
    const task = taskFactory(ctx);
    if (task && typeof task.start === 'function') task.start();
    return { ctx, task };
  });

  await Promise.race([sleep(config.durationMs), allTasksComplete]);

  for (const { task } of taskContexts) {
    if (task && typeof task.stop === 'function') await task.stop();
  }
  for (const bot of bots) bot.disconnect();
  for (const bot of bots) {
    try {
      await api.leaveBoard({ authorization: bot.authorization });
      logger.info(`post-run leaveBoard ok: ${bot.username}`);
    } catch (error) {
      logger.info(`post-run leaveBoard skipped: ${bot.username} (${error.message})`);
    }
  }

  logger.info('run complete');
  if (earlyStopReason) logger.warn('run ended early due to spider failure', earlyStopReason);
  for (const bot of bots) {
    logger.info(`${bot.username}: ownTurns=${bot.metrics.ownTurns}, actionsSent=${bot.metrics.actionsSent}`);
  }
}

module.exports = { runBots };

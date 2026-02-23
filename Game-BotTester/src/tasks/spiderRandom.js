function hashString(input) {
  let h = 2166136261;
  const s = String(input || '');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createRng(seed) {
  let x = (Number(seed) >>> 0) || 1;
  return () => {
    x = (Math.imul(1664525, x) + 1013904223) >>> 0;
    return x / 0x100000000;
  };
}

function choice(rng, items) {
  if (!items.length) return null;
  return items[Math.floor(rng() * items.length)];
}

function toInt(n, fallback = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.floor(v) : fallback;
}

function spiderRandomTaskFactory({ bot, logger, config }) {
  const parsedTarget = Number(config?.roundsTarget);
  const targetHands = Number.isFinite(parsedTarget) && parsedTarget > 0 ? parsedTarget : 12;
  const baseSeed = Number(config?.seed) || Date.now();
  const rng = createRng(baseSeed ^ hashString(bot.username));

  let inFlight = false;
  let actionSentThisTurn = false;
  let completedHands = 0;
  let isDone = false;
  let ownTurnsThisHand = 0;
  let handStartedAt = 0;
  let stallTimer = null;
  let stallReportedForHand = false;
  const handTimeoutMs = 60000;
  const recentEvents = [];

  const coverage = {
    legalActionSeen: new Set(),
    actionSent: new Set(),
    raiseVariantsSent: new Set(),
  };
  const failures = [];

  const markCoverage = (turn, actionLabel) => {
    const allowed = Array.isArray(turn?.aUserAction) ? turn.aUserAction : [];
    allowed.forEach(a => coverage.legalActionSeen.add(String(a)));
    coverage.actionSent.add(String(actionLabel));
    if (String(actionLabel).startsWith('r:') || String(actionLabel).startsWith('rs:')) {
      const variant = String(actionLabel).split(':')[0];
      coverage.raiseVariantsSent.add(variant);
    }
  };

  const recordFailure = (kind, turn, error, selectedAction) => {
    const item = {
      kind,
      user: bot.username,
      hand: completedHands + 1,
      turnId: turn?.turnId || null,
      selectedAction: selectedAction || null,
      allowed: Array.isArray(turn?.aUserAction) ? [...turn.aUserAction] : [],
      toCallAmount: turn?.toCallAmount,
      nMinBet: turn?.nMinBet,
      nMaxBet: turn?.nMaxBet,
      nTableChips: bot.state.nTableChips,
      myChips: bot.state.myChips,
      recentEvents: recentEvents.slice(-12),
      error: error?.message || String(error),
    };
    failures.push(item);
    logger.error(`spider failure (${kind})`, item);
    bot.emit('spiderFailure', item);
  };

  const buildCandidates = turn => {
    const allowed = Array.isArray(turn?.aUserAction) ? turn.aUserAction : [];
    const candidates = [];
    const minBet = Math.max(1, toInt(turn?.nMinBet, toInt(bot.state.nMinBet, 1)));
    const maxBet = Math.max(0, toInt(turn?.nMaxBet, 0));
    const pot = Math.max(0, toInt(bot.state.nTableChips, 0));
    const myChips = Math.max(0, toInt(bot.state.myChips, 0));
    const canRaiseThisTurn = ownTurnsThisHand < 3;

    if (allowed.includes('ck')) candidates.push('ck');
    if (allowed.includes('c')) candidates.push('c');
    if (allowed.includes('f')) candidates.push('f');
    if (allowed.includes('s')) candidates.push('s');
    if (allowed.includes('d')) candidates.push('d');

    if (allowed.includes('r') && canRaiseThisTurn) {
      const raiseAmounts = new Set();
      raiseAmounts.add(minBet);
      raiseAmounts.add(minBet * 2);
      if (pot > 0) {
        raiseAmounts.add(Math.max(minBet, Math.floor(pot / 2)));
        raiseAmounts.add(Math.max(minBet, Math.floor(pot)));
      }
      if (myChips > 0 && (maxBet > 0 ? myChips <= maxBet : myChips <= Math.max(minBet * 4, pot * 2))) raiseAmounts.add(myChips);

      for (const amount of raiseAmounts) {
        if (!Number.isFinite(amount) || amount <= 0) continue;
        if (maxBet > 0 && amount > maxBet) continue;
        candidates.push(`r:${Math.floor(amount)}`);
        candidates.push(`rs:${Math.floor(amount)}`);
      }
    }

    return candidates;
  };

  const chooseFallback = turn => {
    const allowed = Array.isArray(turn?.aUserAction) ? turn.aUserAction : [];
    if (allowed.includes('ck')) return 'ck';
    if (allowed.includes('c')) return 'c';
    if (allowed.includes('f')) return 'f';
    return null;
  };

  const onOwnTurn = async turn => {
    if (isDone || inFlight) return;
    if (actionSentThisTurn) return;
    if (!handStartedAt) handStartedAt = Date.now();
    inFlight = true;
    ownTurnsThisHand += 1;

    const candidates = buildCandidates(turn);
    const selected = choice(rng, candidates);

    try {
      const allowed = Array.isArray(turn.aUserAction) ? turn.aUserAction : [];
      allowed.forEach(a => coverage.legalActionSeen.add(String(a)));

      if (!selected) {
        logger.warn(`turn ${turn.turnId}: no candidate actions`, { allowed });
        return;
      }

      logger.info(`spider turn ${turn.turnId} -> ${selected}`, {
        hand: completedHands + 1,
        allowed,
        toCallAmount: turn.toCallAmount,
        nMinBet: turn.nMinBet,
        nMaxBet: turn.nMaxBet,
        nTableChips: bot.state.nTableChips,
        myChips: bot.state.myChips,
      });

      await bot.performAction(selected, turn, { ackMode: 'probe', ackTimeoutMs: 700 });
      markCoverage(turn, selected);
      actionSentThisTurn = true;
    } catch (error) {
      recordFailure('action-error', turn, error, selected);

      const fallback = chooseFallback(turn);
      if (fallback) {
        try {
          logger.warn(`turn ${turn.turnId}: attempting fallback ${fallback}`);
          await bot.performAction(fallback, turn, { ackMode: 'probe', ackTimeoutMs: 700 });
          markCoverage(turn, fallback);
          actionSentThisTurn = true;
        } catch (fallbackError) {
          recordFailure('fallback-action-error', turn, fallbackError, fallback);
        }
      }
    } finally {
      inFlight = false;
    }
  };

  const onRoundResult = () => {
    if (isDone) return;
    completedHands += 1;
    actionSentThisTurn = false;
    ownTurnsThisHand = 0;
    handStartedAt = 0;
    stallReportedForHand = false;

    logger.info(`spider hand complete (${completedHands}/${targetHands})`, {
      failures: failures.length,
      legalActionSeen: Array.from(coverage.legalActionSeen).sort(),
      raiseVariantsSent: Array.from(coverage.raiseVariantsSent).sort(),
    });

    if (completedHands >= targetHands) {
      emitTaskComplete();
    }
  };

  const onDisconnect = reason => {
    if (isDone) return;
    const item = {
      kind: 'disconnect',
      user: bot.username,
      hand: completedHands + 1,
      reason,
    };
    failures.push(item);
    bot.emit('spiderFailure', item);
  };

  const onAnyEvent = event => {
    if (isDone) return;
    const name = event?.sEventName || 'unknown';
    recentEvents.push({ t: Date.now(), name });
    if (recentEvents.length > 50) recentEvents.shift();
    if (name === 'resDeclareResult') {
      handStartedAt = 0;
      stallReportedForHand = false;
      actionSentThisTurn = false;
      ownTurnsThisHand = 0;
    }
    if (name === 'resPlayerTurn' && !handStartedAt) handStartedAt = Date.now();
  };

  const emitTaskComplete = () => {
    if (isDone) return;
    isDone = true;
    bot.emit('taskComplete', {
      task: 'spider-random',
      completedHands,
      targetHands,
      seed: baseSeed,
      coverage: {
        legalActionSeen: Array.from(coverage.legalActionSeen).sort(),
        actionSent: Array.from(coverage.actionSent).sort(),
        raiseVariantsSent: Array.from(coverage.raiseVariantsSent).sort(),
      },
      failures,
    });
  };

  return {
    start() {
      bot.on('ownTurn', onOwnTurn);
      bot.on('roundResult', onRoundResult);
      bot.on('disconnect', onDisconnect);
      bot.on('event', onAnyEvent);
      stallTimer = setInterval(() => {
        if (isDone || !handStartedAt || stallReportedForHand) return;
        if (Date.now() - handStartedAt < handTimeoutMs) return;
        stallReportedForHand = true;
        recordFailure(
          'hand-stall-timeout',
          { turnId: null, aUserAction: [], toCallAmount: null, nMinBet: bot.state.nMinBet, nMaxBet: null },
          new Error(`No round result within ${handTimeoutMs}ms`),
          null
        );
        emitTaskComplete();
      }, 1000);
      logger.info(`spider-random task started (target hands=${targetHands}, seed=${baseSeed})`);
    },
    stop() {
      bot.off('ownTurn', onOwnTurn);
      bot.off('roundResult', onRoundResult);
      bot.off('disconnect', onDisconnect);
      bot.off('event', onAnyEvent);
      if (stallTimer) clearInterval(stallTimer);
      stallTimer = null;
      logger.info('spider-random task stopped');
    },
  };
}

module.exports = spiderRandomTaskFactory;

function pickRoles(bots = []) {
  const snapshots = bots
    .map(b => ({
      username: b.username,
      chips: Number(b?.state?.myChips),
    }))
    .filter(item => Number.isFinite(item.chips));

  if (!snapshots.length) return { shortStackUsername: null, aggressorUsername: null, snapshots: [] };

  const sorted = [...snapshots].sort((a, b) => a.chips - b.chips);
  return {
    shortStackUsername: sorted[0]?.username || null,
    aggressorUsername: sorted[sorted.length - 1]?.username || null,
    snapshots: sorted,
  };
}

function choosePassiveAction(turn) {
  const allowed = Array.isArray(turn?.aUserAction) ? turn.aUserAction : [];
  if (allowed.includes('ck')) return 'ck';
  if (allowed.includes('c')) return 'c';
  if (allowed.includes('f')) return 'f';
  return null;
}

function sidePotReproTaskFactory({ bot, bots, logger, config }) {
  const parsedTarget = Number(config?.roundsTarget);
  const targetHands = Number.isFinite(parsedTarget) && parsedTarget > 0 ? parsedTarget : 1;
  const { shortStackUsername, aggressorUsername, snapshots } = pickRoles(bots);

  let inFlight = false;
  let completedHands = 0;
  let isDone = false;
  let shortAllInSeenThisHand = false;
  let shortAllInSeenAnyHand = false;
  let aggressorRaisesThisHand = 0;

  const onOwnTurn = async turn => {
    if (isDone || inFlight) return;
    inFlight = true;

    try {
      const allowed = Array.isArray(turn?.aUserAction) ? turn.aUserAction : [];
      let action = null;
      let reason = 'passive';

      // If this bot is the short stack and backend offers short-all-in, take it.
      if (bot.username === shortStackUsername && allowed.includes('a')) {
        action = 'a';
        reason = 'short-stack-all-in';
      }

      // Force a controllable raise from the richest stack to create a short-call side pot on High 100.
      if (!action && bot.username === aggressorUsername && allowed.includes('r') && aggressorRaisesThisHand < 3) {
        const minRaise = Math.max(1, Math.floor(Number(turn?.nMinBet) || 1));
        const potSizedRaise = Math.max(1, Math.floor(Number(bot?.state?.nTableChips) || 0));
        const forceRaiseAmount = Math.max(minRaise, potSizedRaise);
        action = `r:${forceRaiseAmount}`;
        reason = 'force-sidepot-raise';
      }

      if (!action) action = choosePassiveAction(turn);
      if (!action) {
        logger.warn(`turn ${turn.turnId}: no supported action`, { allowed, toCallAmount: turn?.toCallAmount, nMinBet: turn?.nMinBet });
        return;
      }

      logger.info(`turn ${turn.turnId} -> ${action}`, {
        hand: completedHands + 1,
        reason,
        role: bot.username === shortStackUsername ? 'short-stack' : bot.username === aggressorUsername ? 'aggressor' : 'other',
        allowed,
        toCallAmount: turn?.toCallAmount,
        nMinBet: turn?.nMinBet,
        myChips: bot.state.myChips,
      });

      await bot.performAction(action, turn, { ackMode: 'probe', ackTimeoutMs: 700 });
      if (reason === 'force-sidepot-raise') aggressorRaisesThisHand += 1;
    } catch (error) {
      logger.error(`side-pot-repro action failed on turn ${turn?.turnId}: ${error.message}`);
      const fallback = choosePassiveAction(turn);
      if (fallback) {
        try {
          logger.warn(`turn ${turn?.turnId}: fallback -> ${fallback}`);
          await bot.performAction(fallback, turn, { ackMode: 'probe', ackTimeoutMs: 700 });
        } catch (fallbackError) {
          logger.error(`side-pot-repro fallback failed on turn ${turn?.turnId}: ${fallbackError.message}`);
        }
      }
    } finally {
      inFlight = false;
    }
  };

  const onEvent = ({ sEventName, oData }) => {
    if (isDone) return;
    if (sEventName === 'resCall' && oData?.bAllIn && oData?.bShortCall) {
      shortAllInSeenThisHand = true;
      shortAllInSeenAnyHand = true;
      logger.info('short all-in call observed', {
        iUserId: oData?.iUserId,
        nShortAmount: oData?.nShortAmount,
        nTableChips: oData?.nTableChips,
      });
    }
  };

  const onRoundResult = oData => {
    if (isDone) return;
    completedHands += 1;

    logger.info(`hand complete (${completedHands}/${targetHands})`, {
      shortAllInSeenThisHand,
      shortAllInSeenAnyHand,
      winnerCount: Array.isArray(oData?.aWinner) ? oData.aWinner.length : null,
      tableChips: oData?.nTableChips,
    });

    aggressorRaisesThisHand = 0;
    shortAllInSeenThisHand = false;

    if (shortAllInSeenAnyHand || completedHands >= targetHands) {
      isDone = true;
      bot.emit('taskComplete', {
        task: 'side-pot-repro',
        completedHands,
        targetHands,
        shortAllInSeenAnyHand,
        shortStackUsername,
        aggressorUsername,
        snapshots,
      });
    }
  };

  return {
    start() {
      bot.on('ownTurn', onOwnTurn);
      bot.on('event', onEvent);
      bot.on('roundResult', onRoundResult);
      logger.info(`side-pot-repro task started (target hands=${targetHands})`, {
        shortStackUsername,
        aggressorUsername,
        snapshots,
      });
    },
    stop() {
      bot.off('ownTurn', onOwnTurn);
      bot.off('event', onEvent);
      bot.off('roundResult', onRoundResult);
      logger.info('side-pot-repro task stopped');
    },
  };
}

module.exports = sidePotReproTaskFactory;

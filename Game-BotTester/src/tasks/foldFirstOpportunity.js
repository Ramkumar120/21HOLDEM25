function foldFirstOpportunityTaskFactory({ bot, logger, config }) {
  const parsedTarget = Number(config?.roundsTarget);
  const targetHands = Number.isFinite(parsedTarget) && parsedTarget > 0 ? parsedTarget : 1;

  let inFlight = false;
  let hasFoldedThisHand = false;
  let completedHands = 0;
  let isDone = false;

  const onOwnTurn = async turn => {
    if (isDone || hasFoldedThisHand || inFlight) return;
    inFlight = true;
    try {
      const allowed = Array.isArray(turn.aUserAction) ? turn.aUserAction : [];
      if (!allowed.includes('f')) {
        logger.warn(`turn ${turn.turnId}: fold not available`, {
          allowed,
          toCallAmount: turn.toCallAmount,
          nMinBet: turn.nMinBet,
        });
        return;
      }

      logger.info(`turn ${turn.turnId} -> f (first opportunity this hand)`, {
        hand: completedHands + 1,
        allowed,
        toCallAmount: turn.toCallAmount,
        nMinBet: turn.nMinBet,
      });
      await bot.performAction('f', turn);
      hasFoldedThisHand = true;
      logger.info(`fold sent for hand ${completedHands + 1}`);
    } catch (error) {
      logger.error(`fold-first-opportunity failed on turn ${turn.turnId}: ${error.message}`);
    } finally {
      inFlight = false;
    }
  };

  const onRoundResult = () => {
    if (isDone) return;

    completedHands += 1;
    hasFoldedThisHand = false;
    logger.info(`hand complete (${completedHands}/${targetHands})`);

    if (completedHands >= targetHands) {
      isDone = true;
      logger.info(`target reached (${targetHands} hands)`);
      bot.emit('taskComplete', {
        task: 'fold-first-opportunity',
        completedHands,
        targetHands,
      });
    }
  };

  return {
    start() {
      bot.on('ownTurn', onOwnTurn);
      bot.on('roundResult', onRoundResult);
      logger.info(`fold-first-opportunity task started (target hands=${targetHands})`);
    },
    stop() {
      bot.off('ownTurn', onOwnTurn);
      bot.off('roundResult', onRoundResult);
      logger.info('fold-first-opportunity task stopped');
    },
  };
}

module.exports = foldFirstOpportunityTaskFactory;

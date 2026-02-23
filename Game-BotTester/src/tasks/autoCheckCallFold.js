function autoCheckCallFoldTaskFactory({ bot, logger }) {
  let inFlight = false;

  const onOwnTurn = async turn => {
    if (inFlight) return;
    inFlight = true;
    try {
      const allowed = Array.isArray(turn.aUserAction) ? turn.aUserAction : [];
      let action = null;
      if (allowed.includes('ck')) action = 'ck';
      else if (allowed.includes('c')) action = 'c';
      else if (allowed.includes('f')) action = 'f';

      if (!action) {
        logger.warn(`no supported passive action for turn ${turn.turnId}`, allowed);
        return;
      }

      logger.info(`turn ${turn.turnId} -> ${action}`, {
        allowed,
        toCallAmount: turn.toCallAmount,
        nMinBet: turn.nMinBet,
      });
      await bot.performAction(action, turn);
    } catch (error) {
      logger.error(`auto action failed on turn ${turn.turnId}: ${error.message}`);
    } finally {
      inFlight = false;
    }
  };

  return {
    start() {
      bot.on('ownTurn', onOwnTurn);
      logger.info('auto-check-call-fold task started');
    },
    stop() {
      bot.off('ownTurn', onOwnTurn);
      logger.info('auto-check-call-fold task stopped');
    },
  };
}

module.exports = autoCheckCallFoldTaskFactory;

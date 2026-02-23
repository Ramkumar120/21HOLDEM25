function createFallbackChooser(fallbackName) {
  const normalized = String(fallbackName || 'auto').toLowerCase();
  if (normalized === 'none') return () => null;
  if (normalized === 'auto' || normalized === 'auto-check-call-fold' || normalized === 'passive') {
    return turn => {
      const allowed = Array.isArray(turn.aUserAction) ? turn.aUserAction : [];
      if (allowed.includes('ck')) return 'ck';
      if (allowed.includes('c')) return 'c';
      if (allowed.includes('f')) return 'f';
      return null;
    };
  }
  return () => null;
}

function scriptedActionsTaskFactory({ bot, logger, script }) {
  if (!script) throw new Error('scripted-actions task requires script JSON via --script');

  const perUserQueue = Array.isArray(script?.perUser?.[bot.username])
    ? [...script.perUser[bot.username]]
    : [];
  const fallbackChooser = createFallbackChooser(script.fallback);
  let inFlight = false;

  const onOwnTurn = async turn => {
    if (inFlight) return;
    inFlight = true;
    try {
      const next = perUserQueue.length ? perUserQueue.shift() : null;
      const action = next || fallbackChooser(turn);

      logger.info(`turn ${turn.turnId}`, {
        scripted: next || null,
        selected: action || null,
        remainingScriptSteps: perUserQueue.length,
        allowed: turn.aUserAction,
        toCallAmount: turn.toCallAmount,
        nMinBet: turn.nMinBet,
      });

      if (!action) return;
      await bot.performAction(action, turn);
    } catch (error) {
      logger.error(`scripted action failed on turn ${turn.turnId}: ${error.message}`);
    } finally {
      inFlight = false;
    }
  };

  return {
    start() {
      bot.on('ownTurn', onOwnTurn);
      logger.info('scripted-actions task started', {
        scriptSteps: perUserQueue.length,
        fallback: script.fallback || 'auto',
      });
    },
    stop() {
      bot.off('ownTurn', onOwnTurn);
      logger.info('scripted-actions task stopped');
    },
  };
}

module.exports = scriptedActionsTaskFactory;

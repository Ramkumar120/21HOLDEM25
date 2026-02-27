function fiveCommunityProbeTaskFactory({ bot, bots, logger, config }) {
  const parsedTarget = Number(config?.roundsTarget);
  const targetHandsWithFive = Number.isFinite(parsedTarget) && parsedTarget > 0 ? parsedTarget : 1;
  const reporterUsername = Array.isArray(bots) && bots.length ? bots[0].username : bot.username;

  let inFlight = false;
  let isDone = false;
  let completedHands = 0;
  let handsWithFive = 0;
  let currentHandMaxCommunity = 0;
  let successSeenThisHand = false;

  const choosePassiveAction = turn => {
    const allowed = Array.isArray(turn?.aUserAction) ? turn.aUserAction : [];
    if (allowed.includes('ck')) return 'ck';
    if (allowed.includes('c')) return 'c';
    if (allowed.includes('f')) return 'f';
    return null;
  };

  const onOwnTurn = async turn => {
    if (isDone || inFlight) return;
    inFlight = true;
    try {
      const action = choosePassiveAction(turn);
      const allowed = Array.isArray(turn?.aUserAction) ? turn.aUserAction : [];
      if (!action) {
        logger.warn(`turn ${turn.turnId}: no passive action available`, {
          allowed,
          toCallAmount: turn?.toCallAmount,
          nMinBet: turn?.nMinBet,
        });
        return;
      }

      if (bot.username === reporterUsername) {
        logger.info(`turn ${turn.turnId} -> ${action}`, {
          allowed,
          toCallAmount: turn?.toCallAmount,
          nMinBet: turn?.nMinBet,
          hand: completedHands + 1,
        });
      }

      await bot.performAction(action, turn);
    } catch (error) {
      logger.error(`five-community-probe action failed on turn ${turn?.turnId}: ${error.message}`);
    } finally {
      inFlight = false;
    }
  };

  const onEvent = ({ sEventName, oData }) => {
    if (isDone) return;
    if (sEventName !== 'resCommunityCard') return;

    const count = Array.isArray(oData?.aCommunityCard) ? oData.aCommunityCard.length : 0;
    if (count > currentHandMaxCommunity) currentHandMaxCommunity = count;
    if (count >= 5) successSeenThisHand = true;

    if (bot.username === reporterUsername) {
      logger.info(`community card dealt`, {
        hand: completedHands + 1,
        communityCount: count,
        maxThisHand: currentHandMaxCommunity,
      });
    }
  };

  const emitComplete = () => {
    if (isDone) return;
    isDone = true;
    bot.emit('taskComplete', {
      task: 'five-community-probe',
      completedHands,
      handsWithFive,
      targetHandsWithFive,
      success: handsWithFive >= targetHandsWithFive,
    });
  };

  const onRoundResult = oData => {
    if (isDone) return;

    completedHands += 1;
    if (successSeenThisHand) handsWithFive += 1;

    const participantSummary = Array.isArray(oData?.aParticipant)
      ? oData.aParticipant.map(p => ({
          iUserId: p?.iUserId,
          eState: p?.eState,
          nCardScore: p?.nCardScore,
          nWinningAmount: p?.nWinningAmount,
        }))
      : [];
    const activeCount = participantSummary.filter(p => p.eState === 'playing').length;

    if (bot.username === reporterUsername) {
      logger.info(`hand complete`, {
        hand: completedHands,
        currentHandMaxCommunity,
        successSeenThisHand,
        handsWithFive,
        targetHandsWithFive,
        bAllPlayersBust: Boolean(oData?.bAllPlayersBust || oData?.bAllPlayerBust),
        activeCount,
        participantSummary,
      });
    }

    currentHandMaxCommunity = 0;
    successSeenThisHand = false;

    if (handsWithFive >= targetHandsWithFive) emitComplete();
  };

  return {
    start() {
      bot.on('ownTurn', onOwnTurn);
      bot.on('event', onEvent);
      bot.on('roundResult', onRoundResult);
      logger.info(`five-community-probe task started (target hands with 5 community cards=${targetHandsWithFive})`);
    },
    stop() {
      bot.off('ownTurn', onOwnTurn);
      bot.off('event', onEvent);
      bot.off('roundResult', onRoundResult);
      logger.info('five-community-probe task stopped');
    },
  };
}

module.exports = fiveCommunityProbeTaskFactory;

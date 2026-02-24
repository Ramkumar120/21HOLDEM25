function choosePassive(turn) {
  const allowed = Array.isArray(turn?.aUserAction) ? turn.aUserAction : [];
  if (allowed.includes('ck')) return 'ck';
  if (allowed.includes('c')) return 'c';
  if (allowed.includes('s')) return 's';
  if (allowed.includes('f')) return 'f';
  return null;
}

function ddOpenSkipCheckTaskFactory({ bot, bots, config, logger }) {
  const targetUsername = Array.isArray(config?.users) && config.users.length ? config.users[0] : bot.username;

  let inFlight = false;
  let completed = false;
  let ddLocked = false;
  let actionRound = 1; // 1 pre-community, 2 after first CC, etc.
  let raiseSeenThisRound = false;
  let round2UnderTest = false;

  const getTargetUserId = () => {
    const targetBot = Array.isArray(bots) ? bots.find(b => b.username === targetUsername) : null;
    return targetBot?.userId || null;
  };

  const finish = payload => {
    if (completed) return;
    completed = true;
    bot.emit('taskComplete', {
      task: 'dd-open-skip-check',
      targetUsername,
      ...payload,
    });
  };

  const onAnyEvent = event => {
    if (completed) return;
    const targetUserId = getTargetUserId();
    const name = event?.sEventName;
    const data = event?.oData || {};

    if (name === 'resDoubledown' && targetUserId && `${data.iUserId}` === `${targetUserId}`) {
      ddLocked = true;
      logger.info('target DD lock confirmed', { targetUsername, targetUserId });
      return;
    }

    if (name === 'resCommunityCard') {
      const ccCount = Array.isArray(data.aCommunityCard) ? data.aCommunityCard.length : Math.max(0, actionRound - 1) + 1;
      actionRound = ccCount + 1;
      raiseSeenThisRound = false;

      if (ddLocked && ccCount === 1) {
        round2UnderTest = true;
        logger.info('round2 under test started after first community card', { targetUsername });
        return;
      }

      if (round2UnderTest && ccCount >= 2) {
        finish({ status: 'pass', reason: 'target DD player was skipped through round2 open with no raise' });
      }
      return;
    }

    if (name === 'resRaise' && round2UnderTest && actionRound === 2) {
      raiseSeenThisRound = true;
      // Test scope ends once a real raise happens in round 2.
      finish({ status: 'pass', reason: 'round2 raise occurred before illegal open-call prompt on locked DD player' });
      return;
    }

    if (name === 'resDeclareResult' && round2UnderTest) {
      finish({ status: 'pass', reason: 'hand ended without illegal round2 open-call prompt on locked DD player' });
      return;
    }

    if (name === 'resPlayerTurn' && round2UnderTest && !raiseSeenThisRound && actionRound === 2) {
      if (targetUserId && `${data.iUserId}` === `${targetUserId}`) {
        finish({
          status: 'fail',
          reason: 'locked DD player received a turn in round2 before any raise',
          details: {
            aUserAction: data.aUserAction,
            toCallAmount: data.toCallAmount,
            nMinBet: data.nMinBet,
          },
        });
      }
    }
  };

  const onOwnTurn = async turn => {
    if (completed || inFlight) return;
    inFlight = true;
    try {
      if (bot.username === targetUsername && !ddLocked && actionRound === 1 && Array.isArray(turn.aUserAction) && turn.aUserAction.includes('d')) {
        logger.info(`target ${bot.username} taking DD for round2 skip test`, {
          allowed: turn.aUserAction,
          toCallAmount: turn.toCallAmount,
          nMinBet: turn.nMinBet,
        });
        await bot.performAction('d', turn, { ackMode: 'probe', ackTimeoutMs: 700 });
        return;
      }

      const action = choosePassive(turn);
      logger.info(`passive action on turn ${turn.turnId}`, {
        selected: action,
        allowed: turn.aUserAction,
        round: actionRound,
        targetUsername,
        ddLocked,
      });
      if (!action) return;
      await bot.performAction(action, turn, { ackMode: 'probe', ackTimeoutMs: 700 });
    } catch (error) {
      finish({
        status: 'fail',
        reason: `task action error: ${error.message}`,
        bot: bot.username,
      });
    } finally {
      inFlight = false;
    }
  };

  return {
    start() {
      bot.on('event', onAnyEvent);
      bot.on('ownTurn', onOwnTurn);
      logger.info('dd-open-skip-check task started', { targetUsername });
    },
    stop() {
      bot.off('event', onAnyEvent);
      bot.off('ownTurn', onOwnTurn);
      logger.info('dd-open-skip-check task stopped');
    },
  };
}

module.exports = ddOpenSkipCheckTaskFactory;

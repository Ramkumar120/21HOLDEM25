function observeTaskFactory({ bot, logger }) {
  const onEvent = ({ sEventName, oData }) => {
    if (sEventName === 'resPlayerTurn') {
      const mine = bot.userId && `${oData?.iUserId}` === `${bot.userId}`;
      logger.info(`turn event${mine ? ' (mine)' : ''}`, {
        iUserId: oData?.iUserId,
        actions: oData?.aUserAction,
        nMinBet: oData?.nMinBet,
        toCallAmount: oData?.toCallAmount,
      });
      return;
    }
    if (['resRaise', 'resCall', 'resStand', 'resCheck', 'resDoubledown', 'resCommunityCard', 'resDeclareResult'].includes(sEventName)) {
      logger.info(`${sEventName}`, oData || {});
    }
  };

  return {
    start() {
      bot.on('event', onEvent);
      logger.info('observe task started');
    },
    stop() {
      bot.off('event', onEvent);
      logger.info('observe task stopped');
    },
  };
}

module.exports = observeTaskFactory;

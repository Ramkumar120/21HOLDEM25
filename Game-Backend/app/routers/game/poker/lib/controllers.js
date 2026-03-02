const _ = require('../../../../../globals/lib/helper');
const boardManager = require('../../../../game/boardManager');
const { BoardProtoType, User, PokerBoard } = require('../../../../models');
const middleware = require('./middlewares');

const controllers = {};

controllers.listBoard = async (req, res) => {
  try {
    const query = { eStatus: 'y' };
    const project = {
      sName: 1,
      nMinBet: 1,
      // nMaxTableAmount: 1,
      nMinBuyIn: 1,
      // nMaxBuyIn: 1,
      nMaxPlayer: 1,
    };

    const aProtoData = await BoardProtoType.find(query, project).sort({ nMinBet: 1 }).lean();

    return res.reply(messages.success(), aProtoData);
  } catch (error) {
    return res.reply(messages.server_error(), error);
  }
};

controllers.joinBoard = async (req, res) => {
  try {
    if (!req.board) return res.reply(messages.custom.table_not_found);
    const params = {
      iBoardId: req.board._id,
      oProtoData: req.boardProto,
      oUserData: {
        ...req.user,
        nMinBuyIn: req.boardProto.nMinBuyIn,
      },
    };
    const response = await boardManager.addParticipant(params);
    if (!response) return res.reply(messages.not_found('board'));

    await User.updateOne({ _id: req.user._id }, { $addToSet: { aPokerBoard: req.board._id } });

    return res.reply(messages.success(), response);
  } catch (error) {
    console.log('🚀 :: controllers.joinTable= :: error:', error);
    return res.reply(messages.server_error('joinBoard'), error.toString());
  }
};

controllers.leaveBoard = async (req, res) => {
  try {
    if (!req.user.aPokerBoard.length) return res.reply(messages.notFoundCM('Table has been Expired/ Completed!'));
    const activeBoardId = req.user.aPokerBoard[0].toString();
    const activeBoard = await boardManager.getBoard(activeBoardId);
    const participant = activeBoard?.getParticipant?.(req.user._id.toString());
    if (!activeBoard || !participant) {
      await User.updateOne({ _id: req.user._id }, { $pull: { aPokerBoard: activeBoardId } });
      await PokerBoard.updateMany({ iBoardId: activeBoardId }, { $pull: { aParticipants: req.user._id } });
      return res.reply(messages.successCM('Player left the table successfully'));
    }

    emitter.emit('reqLeave', { sEventName: 'reqLeave', iBoardId: activeBoardId, iUserId: req.user._id.toString() }, _.emptyCallback);

    return res.reply(messages.successCM('Player left the table successfully'));
  } catch (error) {
    return res.reply(messages.server_error('leaveBoard'), error.toString());
  }
};

controllers.joinGuestBoard = async (req, res) => {
  try {
    if (!req.board) return res.reply(messages.custom.table_not_found);
    if (req.existingGuestParticipant) {
      return res.reply(messages.success(), {
        iBoardId: req.board._id,
        eState: req.board.eState,
        nChips: req.existingGuestParticipant.nChips,
        sPrivateCode: req.board.sPrivateCode,
        nTotalParticipant: req.board.aParticipant.length,
        eBoardType: req.board.eBoardType,
      });
    }
    const params = {
      iBoardId: req.board._id,
      oProtoData: req.boardProto,
      oUserData: {
        ...req.user,
        nMinBuyIn: req.boardProto.nMinBuyIn,
      },
    };
    const response = await boardManager.addParticipant(params);
    if (!response) return res.reply(messages.not_found('board'));

    await User.updateOne({ _id: req.user._id }, { $addToSet: { aPokerBoard: req.board._id } });

    if (req.shouldSeedGuestBots) {
      const bots = await middleware.createGuestBotUsers(req.guestBotCount || 0, req.boardProto.nMinBuyIn);
      for (const bot of bots) {
        await PokerBoard.updateOne({ iBoardId: req.board._id }, { $addToSet: { aParticipants: bot._id } });
        await User.updateOne({ _id: bot._id }, { $addToSet: { aPokerBoard: req.board._id } });
        await boardManager.addParticipant({
          iBoardId: req.board._id,
          oProtoData: req.boardProto,
          oUserData: {
            ...bot.toObject(),
            nMinBuyIn: req.boardProto.nMinBuyIn,
          },
        });
      }
    }

    return res.reply(messages.success(), response);
  } catch (error) {
    console.log('joinGuestBoard error:', error);
    return res.reply(messages.server_error('joinGuestBoard'), error.toString());
  }
};

module.exports = controllers;

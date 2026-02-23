const _ = require('../../../../../globals/lib/helper');
const boardManager = require('../../../../game/boardManager');
const { BoardProtoType, User, PokerBoard } = require('../../../../models');

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

module.exports = controllers;

const { default: mongoose } = require('mongoose');
const boardManager = require('../../../../game/boardManager');
const { PokerBoard, User } = require('../../../../models');
const { BoardProtoType } = require('../../../../models');

const middleware = {};

middleware.getPrototype = async (req, res, next) => {
  try {
    const { iProtoId } = _.pick(req.body, ['iProtoId']);

    const boardProtoType = await BoardProtoType.findOne({ _id: iProtoId }).lean();
    if (!boardProtoType || boardProtoType.eStatus != 'y') return res.reply(messages.custom.table_not_found);

    req.boardProto = boardProtoType;
    next();
  } catch (error) {
    res.reply(messages.server_error(), error.toString());
  }
};

middleware.joiningProcess = async (req, res, next) => {
  try {
    log.yellow('joining process called :: ');
    if (req.user.aPokerBoard.length) {
      const activeBoardId = req.user.aPokerBoard[0].toString();
      const activeBoard = await boardManager.getBoard(activeBoardId);
      const participant = activeBoard?.getParticipant?.(req.user._id.toString());
      if (!activeBoard || !participant) {
        await User.updateOne({ _id: req.user._id }, { $pull: { aPokerBoard: activeBoardId } });
        await PokerBoard.updateMany({ iBoardId: activeBoardId }, { $pull: { aParticipants: req.user._id } });
        req.user.aPokerBoard = [];
      } else {
        return res.reply(messages.custom.max_board_join_limit);
      }
    }

    const { nChips } = req.user;
    if (nChips < req.boardProto.nMinBuyIn) return res.reply(messages.custom.insufficient_chips);

    const runJoinFlow = async session => {
      const query = { iProtoId: req.boardProto._id, $expr: { $lt: [{ $size: '$aParticipants' }, req.boardProto.nMaxPlayer] } };
      const update = { $addToSet: { aParticipants: req.user._id } };
      const options = session ? { session, new: true } : { new: true };

      let pokerBoard = await PokerBoard.findOneAndUpdate(query, update, options);

      // Self-heal stale mongo board rows that reference missing Redis board state.
      while (pokerBoard) {
        const board = await boardManager.getBoard(pokerBoard.iBoardId.toString());
        if (board) {
          const participant = board.getParticipant(req.user._id.toString());
          if (participant?.eState === 'leave') {
            req.board = await boardManager.createBoard(req.boardProto);
            await new PokerBoard({ iBoardId: req.board._id, iProtoId: req.boardProto._id, aParticipants: [req.user._id] }).save(
              session ? { session } : {}
            );
          } else {
            req.board = board;
          }
          return next();
        }

        log.yellow(`Stale board mapping detected for iBoardId=${pokerBoard.iBoardId}. Cleaning up and retrying join.`);
        await Promise.all([
          PokerBoard.deleteOne({ iBoardId: pokerBoard.iBoardId }, session ? { session } : {}),
          User.updateMany({ aPokerBoard: pokerBoard.iBoardId }, { $pull: { aPokerBoard: pokerBoard.iBoardId } }, session ? { session } : {}),
        ]);

        pokerBoard = await PokerBoard.findOneAndUpdate(query, update, options);
      }

      req.board = await boardManager.createBoard(req.boardProto);
      await new PokerBoard({ iBoardId: req.board._id, iProtoId: req.boardProto._id, aParticipants: [req.user._id] }).save(session ? { session } : {});
      return next();
    };

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const runResult = await runJoinFlow(session);
      await session.commitTransaction();
      return runResult;
    } catch (error) {
      await session.abortTransaction();
      if (error?.message?.includes('Transaction numbers are only allowed on a replica set member or mongos')) {
        log.yellow('Mongo standalone mode detected. Retrying join flow without transaction.');
        return await runJoinFlow(null);
      }
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.log(`${_.now()} joining process failed. reason`, error);
    return res.reply(messages.server_error(), error.toString());
  }
};

middleware.createPrivateBoard = async (req, res, next) => {
  if (req.user.aPokerBoard.length) return res.reply(messages.custom.max_board_join_limit);

  const { nChips } = req.user;
  if (nChips < req.boardProto.nMinBuyIn) return res.reply(messages.custom.insufficient_chips);

  req.boardProto.eBoardType = 'private';
  req.board = await boardManager.createBoard(req.boardProto, {
    eOpponent: 'user',
  });

  await new PokerBoard({ iBoardId: req.board._id, sPrivateCode: req.board.sPrivateCode, aParticipants: [req.user._id] }).save();

  next();
};

middleware.joinPrivateBoard = async (req, res, next) => {
  try {
    if (req.user.aPokerBoard.length) return res.reply(messages.custom.max_board_join_limit);

    const body = _.pick(req.body, ['sPrivateCode']);
    if (!body.sPrivateCode) return res.reply(messages.required_field('private code is'));

    const { nChips } = req.user;

    const query = { sPrivateCode: body.sPrivateCode };
    const pokerBoard = await PokerBoard.findOne(query);
    if (!pokerBoard) return res.reply(messages.custom.invalid_code);

    const board = await boardManager.getBoard(pokerBoard.iBoardId.toString());
    if (!board) return res.reply(messages.custom.table_not_found);

    const participant = board.getParticipant(req.user._id.toString());
    if (participant) return res.reply(messages.alreadyExistsCM("You're already in this game on another tab."));

    if (nChips < board.nMinBuyIn) return res.reply(messages.custom.insufficient_chips);

    await PokerBoard.updateOne(query, { $addToSet: { aParticipants: req.user._id } });
    req.board = board;

    next();
  } catch (error) {
    log.red(error.toString());
    return res.reply(messages.server_error(), error.toString());
  }
};

module.exports = middleware;

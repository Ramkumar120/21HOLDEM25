const { EventEmitter } = require('events');
const { SocketBot } = require('./socketBot');
const { sleep } = require('./sleep');

function decodeJwtPayload(token) {
  try {
    const parts = String(token).split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (error) {
    return null;
  }
}

class BotClient extends EventEmitter {
  constructor({ username, password, api, socketUrl, logger, logEvents = false, actionDelayMs = 250 }) {
    super();
    this.username = username;
    this.password = password;
    this.api = api;
    this.socketUrl = socketUrl;
    this.log = logger;
    this.logEvents = logEvents;
    this.actionDelayMs = actionDelayMs;

    this.authorization = null;
    this.userId = null;
    this.boardId = null;
    this.boardState = null;
    this.socketBot = null;

    this.metrics = { ownTurns: 0, actionsSent: 0 };
  }

  async login() {
    const { authorization } = await this.api.login({ username: this.username, password: this.password });
    this.authorization = authorization;
    const payload = decodeJwtPayload(authorization);
    this.userId = payload?._id ? `${payload._id}` : null;
    this.log.info('login ok');
    return authorization;
  }

  async joinTableViaApi({ privateCode, protoId, minBet, protoIndex }) {
    if (!this.authorization) throw new Error('Call login() first');

    if (privateCode) {
      const joinData = await this.api.joinPrivateBoard({ authorization: this.authorization, sPrivateCode: privateCode });
      this.boardId = `${joinData.iBoardId}`;
      this.log.info(`joined private board via API (${this.boardId})`);
      return joinData;
    }

    const boardList = await this.api.listBoards({ authorization: this.authorization });
    const proto = this.api.selectPrototype(boardList, { protoId, minBet, protoIndex });
    const joinData = await this.api.joinPublicBoard({ authorization: this.authorization, iProtoId: proto._id });
    this.boardId = `${joinData.iBoardId}`;
    this.log.info(`joined public board via API (${this.boardId}) proto=${proto._id} nMinBet=${proto.nMinBet}`);
    return { joinData, proto, boardList };
  }

  async connectSocketAndJoinBoard() {
    if (!this.authorization) throw new Error('Call login() first');
    if (!this.boardId) throw new Error('Call joinTableViaApi() first');

    this.socketBot = new SocketBot({
      socketUrl: this.socketUrl,
      authorization: this.authorization,
      boardId: this.boardId,
      username: this.username,
      logger: this.log.child('socket'),
      logEvents: this.logEvents,
    });

    this.socketBot.on('boardEvent', packet => this.onBoardEvent(packet));
    await this.socketBot.connect();
    const boardState = await this.socketBot.joinBoard();
    this.boardState = boardState;
    this.emit('ready', { boardId: this.boardId, boardState });
    return boardState;
  }

  onBoardEvent(packet) {
    if (!packet || typeof packet !== 'object') return;
    const { sEventName, oData } = packet;

    if (sEventName === 'resPlayerTurn' && oData?.iUserId && this.userId && `${oData.iUserId}` === this.userId) {
      this.metrics.ownTurns += 1;
      this.emit('ownTurn', {
        turnId: this.metrics.ownTurns,
        ...oData,
      });
    }

    if (sEventName === 'resDeclareResult') this.emit('roundResult', oData);
    if (sEventName === 'resCommunityCard') this.emit('communityCard', oData);

    this.emit('event', { sEventName, oData, raw: packet });
  }

  getAllowedActionsFromTurn(turn) {
    return Array.isArray(turn?.aUserAction) ? turn.aUserAction.map(String) : [];
  }

  async performAction(action, turn = {}) {
    if (!this.socketBot) throw new Error('Socket not connected');
    if (!action) throw new Error('Action is required');

    const normalized = this.parseAction(action, turn);
    const allowed = this.getAllowedActionsFromTurn(turn);
    if (normalized.requires && !allowed.includes(normalized.requires)) {
      throw new Error(`Action ${normalized.label} not allowed. Allowed=[${allowed.join(', ')}]`);
    }

    if (this.actionDelayMs > 0) await sleep(this.actionDelayMs);

    let ack;
    switch (normalized.type) {
      case 'check':
        ack = this.socketBot.sendBoardActionNoAck('reqCheck', {});
        break;
      case 'call':
        ack = this.socketBot.sendBoardActionNoAck('reqCall', {});
        break;
      case 'fold':
        ack = this.socketBot.sendBoardActionNoAck('reqFold', {});
        break;
      case 'stand':
        ack = this.socketBot.sendBoardActionNoAck('reqStand', {});
        break;
      case 'doubleDown':
        ack = this.socketBot.sendBoardActionNoAck('reqDoubleDown', {});
        break;
      case 'raise':
        ack = this.socketBot.sendBoardActionNoAck('reqRaise', { nRaiseAmount: normalized.amount });
        break;
      case 'raiseStand':
        ack = this.socketBot.sendBoardActionNoAck('reqRaise', { nRaiseAmount: normalized.amount, bTakeCard: false });
        break;
      default:
        throw new Error(`Unknown normalized action: ${normalized.type}`);
    }

    this.metrics.actionsSent += 1;
    if (ack?.error) {
      this.emit('actionError', { action: normalized, ack, turn });
      throw new Error(typeof ack.error === 'string' ? ack.error : JSON.stringify(ack.error));
    }

    this.emit('actionAck', { action: normalized, ack, turn });
    this.log.info(`action -> ${normalized.label}`);
    return ack;
  }

  parseAction(action, turn = {}) {
    const raw = String(action).trim().toLowerCase();
    const aliases = {
      ck: { type: 'check', requires: 'ck', label: 'check' },
      check: { type: 'check', requires: 'ck', label: 'check' },
      c: { type: 'call', requires: 'c', label: 'call' },
      call: { type: 'call', requires: 'c', label: 'call' },
      f: { type: 'fold', requires: 'f', label: 'fold' },
      fold: { type: 'fold', requires: 'f', label: 'fold' },
      s: { type: 'stand', requires: 's', label: 'stand' },
      stand: { type: 'stand', requires: 's', label: 'stand' },
      d: { type: 'doubleDown', requires: 'd', label: 'doubleDown' },
      dd: { type: 'doubleDown', requires: 'd', label: 'doubleDown' },
      doubledown: { type: 'doubleDown', requires: 'd', label: 'doubleDown' },
    };
    if (aliases[raw]) return aliases[raw];

    if (raw.startsWith('r:') || raw.startsWith('raise:')) {
      const amount = Number(raw.split(':')[1]);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error(`Invalid raise action amount: ${action}`);
      return { type: 'raise', requires: 'r', amount, label: `raise:${amount}` };
    }

    if (raw.startsWith('rs:') || raw.startsWith('raise-stand:') || raw.startsWith('raise+stand:')) {
      const amount = Number(raw.split(':')[1]);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error(`Invalid raise+stand action amount: ${action}`);
      return { type: 'raiseStand', requires: 'r', amount, label: `raise+stand:${amount}` };
    }

    if (raw === 'auto') {
      const allowed = this.getAllowedActionsFromTurn(turn);
      if (allowed.includes('ck')) return aliases.ck;
      if (allowed.includes('c')) return aliases.c;
      if (allowed.includes('f')) return aliases.f;
      throw new Error(`Cannot auto-select action. Allowed=[${allowed.join(', ')}]`);
    }

    throw new Error(`Unsupported action string: ${action}`);
  }

  disconnect() {
    if (this.socketBot) this.socketBot.disconnect();
  }
}

module.exports = { BotClient };

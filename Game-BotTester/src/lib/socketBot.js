const { EventEmitter } = require('events');
const { io } = require('socket.io-client');

class SocketBot extends EventEmitter {
  constructor({ socketUrl, authorization, boardId, username, logger, logEvents = false }) {
    super();
    this.socketUrl = socketUrl;
    this.authorization = authorization;
    this.boardId = `${boardId}`;
    this.username = username;
    this.log = logger;
    this.logEvents = logEvents;
    this.socket = null;
    this.connected = false;
  }

  async connect() {
    if (this.socket && this.connected) return;

    await new Promise((resolve, reject) => {
      const socket = io(this.socketUrl, {
        transports: ['websocket'],
        auth: { authorization: this.authorization },
        extraHeaders: { authorization: this.authorization },
        timeout: 10000,
        reconnection: false,
      });
      this.socket = socket;

      const onConnect = () => {
        cleanup();
        this.connected = true;
        this.log.info(`socket connected (${socket.id})`);
        this.attachDefaultListeners();
        resolve();
      };
      const onError = error => {
        cleanup();
        reject(error instanceof Error ? error : new Error(String(error)));
      };
      const cleanup = () => {
        socket.off('connect', onConnect);
        socket.off('connect_error', onError);
        socket.off('error', onError);
      };

      socket.once('connect', onConnect);
      socket.once('connect_error', onError);
      socket.once('error', onError);
    });
  }

  attachDefaultListeners() {
    if (!this.socket) return;
    this.socket.on('disconnect', reason => {
      this.connected = false;
      this.log.warn(`socket disconnected (${reason})`);
      this.emit('disconnect', reason);
    });
    this.socket.on(this.boardId, packet => {
      if (this.logEvents) this.log.info('board event <-', packet);
      this.emit('boardEvent', packet);
      if (packet?.sEventName) this.emit(packet.sEventName, packet.oData);
    });
  }

  emitWithAck(eventName, payload, timeoutMs = 10000) {
    if (!this.socket || !this.connected) throw new Error('Socket not connected');
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Ack timeout for ${eventName}`)), timeoutMs);
      this.socket.emit(eventName, payload, response => {
        clearTimeout(timer);
        resolve(response);
      });
    });
  }

  async joinBoard({ isReconnect = false } = {}) {
    const res = await this.emitWithAck('reqJoinBoard', { iBoardId: this.boardId, isReconnect }, 15000);
    if (res?.error) throw new Error(`reqJoinBoard failed: ${res.error}`);
    this.log.info(`joined board ${this.boardId} via socket`);
    return res?.oData || res;
  }

  async sendBoardAction(sEventName, oData = {}) {
    const payload = { sEventName, oData };
    const res = await this.emitWithAck(this.boardId, payload, 10000);
    return res;
  }

  sendBoardActionNoAck(sEventName, oData = {}) {
    if (!this.socket || !this.connected) throw new Error('Socket not connected');
    const payload = { sEventName, oData };
    this.socket.emit(this.boardId, payload);
    return { noAck: true, sent: true };
  }

  async ping() {
    return await this.emitWithAck('ping', {});
  }

  disconnect() {
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket = null;
    this.connected = false;
  }
}

module.exports = { SocketBot };

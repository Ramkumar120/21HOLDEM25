const { requestJson, unwrapReply } = require('./http');

class BackendApi {
  constructor({ apiBaseUrl, logger }) {
    this.apiBaseUrl = apiBaseUrl.replace(/\/+$/, '');
    this.log = logger;
  }

  buildUrl(path) {
    return `${this.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  async login({ username, password }) {
    const res = await requestJson(this.buildUrl('/auth/login'), {
      method: 'POST',
      body: { sEmail: username, sPassword: password },
    });
    const reply = unwrapReply(res, `login(${username})`);

    const headerToken = reply.headers.get('authorization') || reply.headers.get('Authorization');
    const bodyToken = reply.data.authorization;
    const authorization = headerToken || bodyToken;
    if (!authorization) throw new Error(`login(${username}) did not return authorization token`);

    return { authorization, reply };
  }

  async listBoards({ authorization }) {
    const res = await requestJson(this.buildUrl('/poker/board/list'), {
      headers: { Authorization: authorization },
    });
    const reply = unwrapReply(res, 'listBoards');
    return reply.data;
  }

  async joinPublicBoard({ authorization, iProtoId }) {
    const res = await requestJson(this.buildUrl('/poker/board/join'), {
      method: 'POST',
      headers: { Authorization: authorization },
      body: { iProtoId },
      timeoutMs: 20000,
    });
    const reply = unwrapReply(res, `joinPublicBoard(${iProtoId})`);
    return reply.data;
  }

  async joinPrivateBoard({ authorization, sPrivateCode }) {
    const res = await requestJson(this.buildUrl('/poker/private/join'), {
      method: 'POST',
      headers: { Authorization: authorization },
      body: { sPrivateCode },
      timeoutMs: 20000,
    });
    const reply = unwrapReply(res, `joinPrivateBoard(${sPrivateCode})`);
    return reply.data;
  }

  async leaveBoard({ authorization }) {
    const res = await requestJson(this.buildUrl('/poker/board/leave'), {
      method: 'GET',
      headers: { Authorization: authorization },
      timeoutMs: 20000,
    });
    const reply = unwrapReply(res, 'leaveBoard');
    return reply.data;
  }

  selectPrototype(boardList, criteria = {}) {
    if (!Array.isArray(boardList) || !boardList.length) throw new Error('No board prototypes returned from backend');

    const { protoId, minBet, protoIndex = 0 } = criteria;
    if (protoId) {
      const found = boardList.find(board => `${board._id}` === `${protoId}`);
      if (!found) throw new Error(`Prototype ${protoId} not found`);
      return found;
    }

    if (minBet != null) {
      const found = boardList.find(board => Number(board.nMinBet) === Number(minBet));
      if (!found) throw new Error(`No prototype found with nMinBet=${minBet}`);
      return found;
    }

    const selected = boardList[protoIndex] || boardList[0];
    return selected;
  }
}

module.exports = { BackendApi };

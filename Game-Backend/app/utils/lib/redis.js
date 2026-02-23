/* eslint-disable consistent-return */
/* eslint-disable no-underscore-dangle */
/* eslint-disable class-methods-use-this */
// /* eslint-disable new-cap */
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

class RedisClient {
  constructor() {
    this.options = {
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      legacyMode: false,
      lazyConnect: true,
      connectTimeout: 10000,
    };
  }

  _setJsonCompatLayer() {
    const parse = value => {
      if (value === null || value === undefined) return null;
      try {
        return JSON.parse(value);
      } catch (error) {
        return null;
      }
    };

    const getPathKey = path => {
      if (!path || path === '.' || path === '$') return '';
      if (path.startsWith('$.')) return path.slice(2);
      if (path.startsWith('.')) return path.slice(1);
      if (path.startsWith('$')) return path.slice(1);
      return path;
    };

    const setByPath = (obj, path, value) => {
      const key = getPathKey(path);
      if (!key) return value;
      const next = obj && typeof obj === 'object' ? obj : {};
      next[key] = value;
      return next;
    };

    const getByPath = (obj, path) => {
      if (obj === null || obj === undefined) return null;
      const key = getPathKey(path);
      if (!key) return obj;
      return obj[key];
    };

    const delByPath = (obj, path) => {
      if (!obj || typeof obj !== 'object') return { next: obj, deleted: 0 };
      const key = getPathKey(path);
      if (!key) return { next: null, deleted: 1 };
      if (!(key in obj)) return { next: obj, deleted: 0 };
      delete obj[key];
      return { next: obj, deleted: 1 };
    };

    const jsonCompat = {
      set: async (redisKey, path, value) => {
        const raw = await this.client.get(redisKey);
        const current = parse(raw);
        const next = setByPath(current, path, value);
        await this.client.set(redisKey, JSON.stringify(next));
        return 'OK';
      },
      SET: async (redisKey, path, value) => jsonCompat.set(redisKey, path, value),
      get: async (redisKey, path = undefined) => {
        const raw = await this.client.get(redisKey);
        const current = parse(raw);
        return getByPath(current, path);
      },
      GET: async (redisKey, path = undefined) => jsonCompat.get(redisKey, path),
      del: async (redisKey, path = undefined) => {
        if (!path || path === '.' || path === '$') return this.client.del(redisKey);
        const raw = await this.client.get(redisKey);
        const current = parse(raw);
        const { next, deleted } = delByPath(current, path);
        if (!deleted) return 0;
        if (next === null) return this.client.del(redisKey);
        await this.client.set(redisKey, JSON.stringify(next));
        return 1;
      },
      DEL: async (redisKey, path = undefined) => jsonCompat.del(redisKey, path),
    };

    this.client.json = jsonCompat;
  }

  async _ensureJsonSupport() {
    try {
      const probeKey = '__json_probe_key__';
      await this.client.json.set(probeKey, '.', { ok: true });
      await this.client.del(probeKey);
    } catch (error) {
      if ((error?.message || '').includes("unknown command 'JSON.SET'")) {
        log.yellow('RedisJSON module not found. Falling back to JSON compatibility layer.');
        this._setJsonCompatLayer();
        return;
      }
      throw error;
    }
  }

  async initialize() {
    try {
      this.client = createClient(this.options);
      this.subClient = createClient(this.options);
      this.pubClient = createClient(this.options);
      await Promise.all([this.client.connect(), this.pubClient.connect(), this.subClient.connect()]);
      await this._ensureJsonSupport();
      if (process.env.NODE_ENV !== 'prod') await this.subClient.CONFIG_SET('notify-keyspace-events', 'Ex');
      await this.subClient.subscribe(['__keyevent@0__:expired', 'redisEvent'], this.onMessage, false);

      this.client.on('error', log.error);
      this.pubClient.on('error', log.error);
      this.subClient.on('error', log.error);
      log.green('Redis Connected Successfully!!!⚡');
    } catch (error) {
      log.error(`${_.now()} Error Occurred on redis initialize. reason :${error.message}`);
    }
  }

  async setupConfig() {
    log.cyan('Redis initialized ⚡ \n---------------------------------');
  }

  getAdapter() {
    // return ioRedis({
    //   ...this.options,
    //   subClient: this.subClient,
    //   pubClient: this.pubClient,
    // });
    return createAdapter(this.pubClient, this.subClient);
  }

  async onMessage(message, channel) {
    let _channel;
    let _message;

    const [iBoardId, scheduler, sTaskName, iUserId, sGame, sHostIp] = message.split(':'); // 'sch:fqr6dlI_2Gg2TcH3_YTfj:assignBot::127.0.0.1' // `sch:${iBattleId}:${sTaskName}:${iUserId}:pokerJack:${host}`
    if (channel === '__keyevent@0__:expired' && sGame === 'pokerJack') {
      if (scheduler !== 'scheduler') return false;
      // In local setups HOST is often unset; only enforce host pinning when HOST is explicitly configured.
      if (process.env.HOST && sHostIp !== process.env.HOST) return false;
      _channel = sTaskName; // 'sch'
      _message = { sTaskName, iBoardId, iUserId };
    } else {
      _channel = channel;
      _message = message;
    }

    let parsedMessage = '';
    try {
      parsedMessage = _.parse(_message);
    } catch (err) {
      log.red('err in onMessage!');
      console.log(error);
      parsedMessage = _message;
    }
    await emitter.asyncEmit(_channel, parsedMessage); // ch : redisEvent | sch
  }
}

module.exports = new RedisClient();

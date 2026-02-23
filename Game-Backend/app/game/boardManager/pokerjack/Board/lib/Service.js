/* eslint-disable no-continue */
const { User } = require('../../../../../models');
const { redis } = require('../../../../../utils');
const Participant = require('../../Participant');

class Service {
  constructor(oBoardData) {
    this._id = oBoardData._id;
    this.iProtoId = oBoardData.iProtoId;
    this.aParticipant = oBoardData.aParticipant ? oBoardData.aParticipant.map(p => new Participant(p, this)) : [];
    this.aCommunityCard = oBoardData.aCommunityCard ?? []; // max three cards
    this.aDeck = oBoardData.aDeck ?? [];
    this.oSocketId = oBoardData.oSocketId;
    this.eState = oBoardData.eState;
    this.nTableChips = oBoardData.nTableChips ?? 0;
    this.iUserTurn = oBoardData.iUserTurn;
    // this.iUtgId = oBoardData.iUtgId;
    this.iDealerId = oBoardData.iDealerId;
    this.iSmallBlindId = oBoardData.iSmallBlindId;
    this.iBigBlindId = oBoardData.iBigBlindId;
    this.nMinBuyIn = oBoardData.nMinBuyIn ?? 0; // nMinBuyIn ex. 500 user chips for joining table
    this.nMaxBuyIn = oBoardData.nMaxBuyIn ?? 0; // nMaxBuyIn ex. 5000 user chips for joining table
    this.nMaxTableAmount = oBoardData.nMaxTableAmount ?? 0; // nMaxTableAmount ex. 10000 limit for total chips in table
    this.nMinBet = oBoardData.nMinBet ?? 0; // nMinBet ex. 5 user can call/raise starting from nMinBet
    this.nMaxBet = oBoardData.nMaxBet ?? 0; // nMaxBet ex. 500 user can call/raise upto nMaxBet // nMaxBet change according to nTableChips
    this.nMaxPlayer = oBoardData.nMaxPlayer;
    this.nTableRound = oBoardData.nTableRound ?? 1;
    this.nGameRound = oBoardData.nGameRound ?? 1;
    this.ePokerType = oBoardData.ePokerType;
    this.oSetting = oBoardData.oSetting;
    this.sPrivateCode = oBoardData.sPrivateCode;
    this.oGameInfo = oBoardData.oGameInfo;
  }

  async initializeGame() {
    try {
      if (this.aParticipant.length < 3) {
        this.emit('resRefundOnLongWait', { message: 'Please wait for other players to join', nMaxWaitingTime: this.oSetting.nMaxWaitingTime });
        return this.setSchedular('refundOnLongWait', '', this.oSetting.nMaxWaitingTime);
      }

      this.eState = 'playing';
      this.aParticipant = this.aParticipant.map(p => {
        p.eState = 'playing';
        return p;
      });

      let dealer = this.getParticipant(this.iDealerId);
      if (!dealer) dealer = this.getParticipant(this.iSmallBlindId);
      if (!dealer) dealer = this.getParticipant(this.iBigBlindId);
      if (!dealer) dealer = this.aParticipant[0];
      dealer = this.getNextParticipant(dealer?.nSeat);
      this.iUserTurn = dealer?.iUserId;
      this.iDealerId = this.iUserTurn;

      // this.iDealerId = dealer?.iUserId;

      // this.iUtgId = this.getPreviousParticipant(dealer?.nSeat)?.iUserId;
      // this.iUserTurn = this.iUtgId;

      const smallBlind = this.getNextParticipant(dealer?.nSeat);
      this.iSmallBlindId = smallBlind?.iUserId;
      const bigBlind = this.getNextParticipant(smallBlind?.nSeat);
      this.iBigBlindId = bigBlind?.iUserId;

      await this.update({
        iUserTurn: this.iUserTurn,
        // iUtgId: this.iUtgId,
        iDealerId: this.iDealerId,
        iSmallBlindId: this.iSmallBlindId,
        iBigBlindId: this.iBigBlindId,
        eState: this.eState,
        aParticipant: this.aParticipant,
      });
      this.emit('resBoardState', this.toJSON());

      await this.collectBootAmount();
    } catch (error) {
      console.log('initializeGame', error);
    }
  }

  updateClass(oBoardData) {
    try {
      this._id = oBoardData._id;
      this.iProtoId = oBoardData.iProtoId;
      this.aParticipant = oBoardData.aParticipant ? oBoardData.aParticipant.map(p => new Participant(p, this)) : [];
      this.aCommunityCard = oBoardData.aCommunityCard ?? [];
      this.oSocketId = oBoardData.oSocketId;
      this.eState = oBoardData.eState;
      this.iUserTurn = oBoardData.iUserTurn;
      this.iDealerId = oBoardData.iDealerId;
      // this.iUtgId = oBoardData.iUtgId;
      this.iSmallBlindId = oBoardData.iSmallBlindId;
      this.iBigBlindId = oBoardData.iBigBlindId;
      this.nTableChips = oBoardData.nTableChips ?? 0;
      this.nMinBuyIn = oBoardData.nMinBuyIn ?? 0;
      // this.nMaxBuyIn = oBoardData.nMaxBuyIn ?? 0;
      // this.nMaxTableAmount = oBoardData.nMaxTableAmount ?? 0;
      this.nMinBet = oBoardData.nMinBet ?? 0;
      this.nMaxBet = oBoardData.nMaxBet ?? 0;
      this.nMaxPlayer = oBoardData.nMaxPlayer;
      this.nTableRound = oBoardData.nTableRound ?? 1;
      this.nGameRound = oBoardData.nGameRound ?? 1;
      this.sPrivateCode = oBoardData.sPrivateCode;
      this.ePokerType = oBoardData.ePokerType;
      this.oSetting = oBoardData.oSetting;
      this.oGameInfo = oBoardData.oGameInfo;
      return this;
    } catch (error) {
      console.log('updateClass', error);
    }
  }

  getParticipant(iUserId) {
    try {
      const sUserId = _.toString(iUserId);
      return this.aParticipant.find(p => _.toString(p.iUserId) === sUserId);
    } catch (error) {
      console.log('getParticipant', error);
    }
  }

  getNextParticipant(nSeat) {
    try {
      let participant = this.aParticipant.find(p => p.nSeat > nSeat && p.eState === 'playing');
      if (!participant) participant = this.aParticipant.find(p => p.nSeat < nSeat && p.eState === 'playing');
      if (!participant) return log.red('No next participant found');
      return participant;
    } catch (error) {
      console.log('getNextParticipant', error);
    }
  }

  getPreviousParticipant(nSeat) {
    try {
      let participant = this.aParticipant.find(p => p.nSeat < nSeat && p.eState === 'playing');
      if (!participant) participant = this.aParticipant.find(p => p.nSeat > nSeat && p.eState === 'playing');
      if (!participant) return log.red('No previous participant found');
      return participant;
    } catch (error) {
      console.log('getPreviousParticipant', error);
    }
  }

  async addParticipant(oUserData) {
    log.green('Add Participant in PokerJack Game: ');
    try {
      const _userData = {
        ...oUserData,
        nChips: oUserData.nMinBuyIn,
        iUserId: _.toString(oUserData._id),
        nSeat: this.getEmptySeat(),
        eState: 'waiting',
      };

      const oParticipant = new Participant(_userData, this);
      this.aParticipant.push(oParticipant);

      log.red('In add participant ::');

      if (this.sPrivateCode) {
        this.oSetting.nMaxWaitingTime = 30 * 60 * 1000;
        await User.updateOne({ _id: oUserData._id }, { $set: { sPrivateCode: this.sPrivateCode } });
      }
      if (this.aParticipant.length === 1) this.setSchedular('refundOnLongWait', '', this.oSetting.nMaxWaitingTime);

      if (this.aParticipant.length === 3) {
        await this.deleteScheduler('refundOnLongWait', '');
        this.eState = 'initialized';
        this.aParticipant.map(p => (p.eState = 'playing'));
        await this.update({ aParticipant: this.aParticipant.map(p => p.toJSON()) });

        const bInitializeTimer = await this.getScheduler('initializeGame');
        const bResetTable = await this.getScheduler('resetTable');
        if (!bInitializeTimer && !bResetTable) await this.setSchedular('initializeGame', null, this.oSetting.nInitializeTimer);
      }

      if (this.aParticipant.length > 3) {
        oParticipant.eState = 'spectator';

        const nRemainingInitializeTime = await this.getScheduler('initializeGame');
        if (nRemainingInitializeTime) await oParticipant.emit('initializeGame', { nInitializeTimer: nRemainingInitializeTime });
      }

      await this.update({ aParticipant: [oParticipant.toJSON()], __debugParticipantWrite: Date.now(), eState: this.eState, oSetting: this.oSetting });

      return {
        iBoardId: this._id,
        eState: this.eState,
        nChips: oParticipant.nChips,
        sPrivateCode: this.sPrivateCode,
        nTotalParticipant: this.aParticipant.length,
        eBoardType: this.eBoardType,
      };
    } catch (error) {
      console.log('error from addParticipant :: ', error);
      return false;
    }
  }

  getEmptySeat() {
    try {
      const aBookedSeat = this.aParticipant.map(p => p.nSeat);
      const aEmptySeat = [];
      for (let i = 0; i < this.nMaxPlayer; i += 1) if (!aBookedSeat.includes(i)) aEmptySeat.push(i);
      const randomSeatIndex = _.randomBetween(0, aEmptySeat.length - 1);
      return aEmptySeat[randomSeatIndex];
    } catch (error) {
      console.log('getEmptySeat', error);
    }
  }

  async save(oData = this.toJSON()) {
    try {
      delete oData.aParticipant;
      await redis.client.json.set(_.getBoardKey(this._id), '.', oData);
      return true;
    } catch (error) {
      console.log('save', error);
    }
  }

  async update(oData) {
    try {
      const _key = _.getBoardKey(this._id);
      for (const [field, value] of Object.entries(oData)) {
        if (field !== 'aParticipant') {
          this[field] = value;
          await redis.client.json.set(_key, `.${field}`, value);
        } else {
          for (const p of value) {
            const participant = p?.toJSON ? p.toJSON() : p;
            const sParticipantId = _.toString(participant?.iUserId);
            if (!sParticipantId) throw new Error(`Invalid participant payload in update(): ${_.stringify(participant)}`);

            // Keep writes sequential to avoid lost updates in JSON compat mode (read-modify-write).
            await redis.client.json.set(_key, `.aParticipant_${sParticipantId}`, participant);
            // Cleanup legacy key shape created by old builds.
            await redis.client.json.del(_key, `.aParticipant-${sParticipantId}`);
          }
        }
      }
    } catch (error) {
      console.log('update::::', error);
      console.log('error stack:::', error.stack);
      throw error;
    }
  }

  async setSchedular(sTaskName = '', iUserId = '', nTimeMS = 0) {
    try {
      if (!sTaskName) return false;
      if (!nTimeMS) return false;

      // log.info('setSchedular:', sTaskName, this.iBattleId, iUserId, nTimeMS);
      return redis.client.pSetEx(_.getSchedulerKey(sTaskName, _.toString(this._id), iUserId), nTimeMS, sTaskName);
    } catch (err) {
      console.log('setSchedular', err);
      log.error('err.message :: ', _.stringify(err.message));
      log.error('err :: ', _.stringify(err));
      log.error(
        `table.setSchedular() failed.${{
          reason: err.message,
          stack: err.stack,
        }}`
      );
      return false;
    }
  }

  async getScheduler(sTask, iUserId = '*') {
    try {
      let schedularKey = '';

      const aSchedular = await redis.client.keys(_.getSchedulerKey(sTask, this._id, iUserId, '*'));
      if (aSchedular.length > 1) redis.client.unlink(aSchedular.slice(1));
      schedularKey = aSchedular[0];

      if (!schedularKey) return null;
      const ttl = await redis.client.pTTL(schedularKey);
      return ttl;
    } catch (error) {
      console.log('getScheduler', error);
    }
  }

  async deleteScheduler(sTaskName = '', iUserId = '*') {
    try {
      const sKey = _.getSchedulerKey(sTaskName, this._id, iUserId);

      const schedularKeys = await redis.client.keys(sKey);
      if (!schedularKeys.length) return false;

      const deletionCount = await redis.client.unlink(schedularKeys);

      log.red(`deleted scheduler ${sTaskName} from ${this._id}`);
      return deletionCount;
    } catch (err) {
      log.error(`table.deleteScheduler(sTaskName: ${sTaskName}, iUserId: ${iUserId}, iBoardId: ${this._id}) failed. reason: ${err.message}`);
      return false;
    }
  }

  toJSON() {
    try {
      const table = _.pick(this, [
        '_id',
        'iProtoId',
        'aCommunityCard',
        'aDeck',
        'oSocketId',
        'eState',
        'iUserTurn',
        // 'iUtgId',
        'iDealerId',
        'iSmallBlindId',
        'iBigBlindId',
        'nMinBuyIn',
        // 'nMaxBuyIn',
        // 'nMaxTableAmount',
        'nMinBet',
        'nMaxBet',
        'nMaxPlayer',
        'nTableChips',
        'sPrivateCode',
        'nTableRound',
        'nGameRound',
        'ePokerType',
        'oSetting',
        'oGameInfo',
      ]);
      table.aParticipant = this.aParticipant.map(p => p.toJSON());
      return table;
    } catch (error) {
      console.log('toJSON', error);
    }
  }
}

module.exports = Service;

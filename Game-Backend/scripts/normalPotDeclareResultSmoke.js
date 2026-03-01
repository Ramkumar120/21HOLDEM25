/* eslint-disable no-console */
const assert = require('assert');

require('../globals');

const models = require('../app/models');
const utils = require('../app/utils');
const Board = require('../app/game/boardManager/pokerjack/Board');

const captured = {
  txns: [],
  logs: [],
  emits: [],
  updates: [],
};
const forceExitTimer = setTimeout(() => {
  console.error('FAIL normalPotDeclareResultSmoke (timeout)');
  process.exit(2);
}, 15000);

models.Setting.findOne = () => ({
  lean: async () => ({ nRakeAmount: 0 }),
});
models.Transaction.insertMany = async docs => {
  captured.txns.push(...docs);
};
utils.mongodb.mongify = value => value;

function makeParticipant({ id, score, contribution, isAllInLock = false }) {
  return {
    iUserId: id,
    eState: 'playing',
    isAllInLock,
    nCardScore: score,
    nTotalBidChips: contribution,
    nChips: 0,
    nWinningAmount: 0,
    aCardHand: [],
    bNextTurnLeave: false,
    async updateUser() {},
    toJSON() {
      return {
        iUserId: this.iUserId,
        eState: this.eState,
        isAllInLock: this.isAllInLock,
        nCardScore: this.nCardScore,
        nTotalBidChips: this.nTotalBidChips,
        nChips: this.nChips,
        nWinningAmount: this.nWinningAmount,
        aCardHand: this.aCardHand,
        bNextTurnLeave: this.bNextTurnLeave,
      };
    },
  };
}

async function run() {
  const p1 = makeParticipant({ id: 'p1', score: 18, contribution: 200 });
  const p2 = makeParticipant({ id: 'p2', score: 19, contribution: 300 });

  const fakeBoard = {
    _id: 'board-test',
    iProtoId: 'proto-test',
    nGameRound: 1,
    nTableChips: 500,
    eState: 'playing',
    oSetting: { nRoundStartsIn: 1000 },
    aParticipant: [p1, p2],
    async getScheduler() {
      return null;
    },
    async deleteScheduler() {},
    async saveLogs(logs) {
      captured.logs.push(...logs);
    },
    async update(data) {
      captured.updates.push(data);
    },
    setSchedular() {},
    async emit(name, data) {
      captured.emits.push({ name, data });
    },
  };

  await Board.prototype.declareResult.call(fakeBoard, [p2], 'normalPotDeclareResultSmoke');

  assert.strictEqual(p1.nWinningAmount, 0, 'losing player should not receive chips from an ordinary unequal-contribution pot');
  assert.strictEqual(p2.nWinningAmount, 500, 'winner should receive the full pot');
  assert.strictEqual(p2.eState, 'winner', 'winner should be marked winner');

  const potLog = captured.logs.find(log => log.sAction === 'potDistribution');
  assert.ok(potLog, 'potDistribution log should be recorded');
  const singlePot = Array.isArray(potLog.aSidePotSummary)
    ? potLog.aSidePotSummary.find(x => x.eType === 'single-pot-fallback')
    : null;
  const sidePots = Array.isArray(potLog.aSidePotSummary) ? potLog.aSidePotSummary.filter(x => x.eType === 'side-pot') : [];

  assert.ok(singlePot, 'expected a single-pot payout summary');
  assert.strictEqual(sidePots.length, 0, 'ordinary unequal contributions should not create side pots');

  console.log('PASS normalPotDeclareResultSmoke');
  console.log(
    JSON.stringify(
      {
        payouts: {
          p1: p1.nWinningAmount,
          p2: p2.nWinningAmount,
        },
        payoutSummary: potLog.aSidePotSummary,
      },
      null,
      2
    )
  );
}

run()
  .then(() => {
    clearTimeout(forceExitTimer);
    process.exit(0);
  })
  .catch(error => {
    clearTimeout(forceExitTimer);
    console.error('FAIL normalPotDeclareResultSmoke');
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });

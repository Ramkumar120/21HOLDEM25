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
  console.error('FAIL sidePotDeclareResultSmoke (timeout)');
  process.exit(2);
}, 15000);

// Stub DB/model side effects so this runs as a deterministic local smoke test.
models.Setting.findOne = () => ({
  lean: async () => ({ nRakeAmount: 0 }),
});
models.Transaction.insertMany = async docs => {
  captured.txns.push(...docs);
};
utils.mongodb.mongify = value => value;

function makeParticipant({ id, score, contribution }) {
  return {
    iUserId: id,
    eState: 'playing',
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
  const p1 = makeParticipant({ id: 'p1', score: 20, contribution: 100 });
  const p2 = makeParticipant({ id: 'p2', score: 18, contribution: 200 });
  const p3 = makeParticipant({ id: 'p3', score: 19, contribution: 200 });

  const fakeBoard = {
    _id: 'board-test',
    iProtoId: 'proto-test',
    nGameRound: 1,
    nTableChips: 500,
    eState: 'playing',
    oSetting: { nRoundStartsIn: 1000 },
    aParticipant: [p1, p2, p3],
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

  await Board.prototype.declareResult.call(fakeBoard, [p1], 'sidePotDeclareResultSmoke');

  assert.strictEqual(p1.nWinningAmount, 300, 'p1 should win main pot (300)');
  assert.strictEqual(p2.nWinningAmount, 0, 'p2 should not win any pot');
  assert.strictEqual(p3.nWinningAmount, 200, 'p3 should win side pot (200)');
  assert.strictEqual(p1.eState, 'winner', 'p1 should be marked winner');
  assert.strictEqual(p3.eState, 'winner', 'p3 should be marked winner');

  const potLog = captured.logs.find(log => log.sAction === 'potDistribution');
  assert.ok(potLog, 'potDistribution log should be recorded');
  const sidePots = Array.isArray(potLog.aSidePotSummary) ? potLog.aSidePotSummary.filter(x => x.eType === 'side-pot') : [];
  assert.strictEqual(sidePots.length, 2, 'expected main pot + one side pot summaries');

  const mainPot = sidePots.find(p => p.nAmount === 300);
  const sidePot = sidePots.find(p => p.nAmount === 200);
  assert.ok(mainPot, 'main pot summary (300) missing');
  assert.ok(sidePot, 'side pot summary (200) missing');
  assert.deepStrictEqual(mainPot.aWinner, ['p1'], 'main pot should go to p1');
  assert.deepStrictEqual(sidePot.aWinner, ['p3'], 'side pot should go to p3');

  console.log('PASS sidePotDeclareResultSmoke');
  console.log(
    JSON.stringify(
      {
        payouts: {
          p1: p1.nWinningAmount,
          p2: p2.nWinningAmount,
          p3: p3.nWinningAmount,
        },
        sidePots: sidePots.map(p => ({ nAmount: p.nAmount, aWinner: p.aWinner })),
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
    console.error('FAIL sidePotDeclareResultSmoke');
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });

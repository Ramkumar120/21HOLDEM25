const observe = require('./observe');
const autoCheckCallFold = require('./autoCheckCallFold');
const foldFirstOpportunity = require('./foldFirstOpportunity');
const spiderRandom = require('./spiderRandom');
const scriptedActions = require('./scriptedActions');
const ddOpenSkipCheck = require('./ddOpenSkipCheck');
const sidePotRepro = require('./sidePotRepro');

const TASKS = {
  observe,
  'auto-check-call-fold': autoCheckCallFold,
  'fold-first-opportunity': foldFirstOpportunity,
  'spider-random': spiderRandom,
  'scripted-actions': scriptedActions,
  'dd-open-skip-check': ddOpenSkipCheck,
  'side-pot-repro': sidePotRepro,
};

function getTaskFactory(name) {
  const key = String(name || '').trim();
  const task = TASKS[key];
  if (!task) {
    const available = Object.keys(TASKS).join(', ');
    throw new Error(`Unknown task "${name}". Available: ${available}`);
  }
  return task;
}

module.exports = { getTaskFactory, TASKS };

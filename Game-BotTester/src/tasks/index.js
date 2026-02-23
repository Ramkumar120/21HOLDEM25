const observe = require('./observe');
const autoCheckCallFold = require('./autoCheckCallFold');
const foldFirstOpportunity = require('./foldFirstOpportunity');
const scriptedActions = require('./scriptedActions');

const TASKS = {
  observe,
  'auto-check-call-fold': autoCheckCallFold,
  'fold-first-opportunity': foldFirstOpportunity,
  'scripted-actions': scriptedActions,
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

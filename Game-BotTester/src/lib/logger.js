function ts() {
  return new Date().toISOString();
}

function formatScope(scope) {
  return scope ? `[${scope}]` : '';
}

function createLogger(scope = '') {
  const prefix = () => `${ts()} ${formatScope(scope)}`.trim();

  return {
    info(...args) {
      console.log(prefix(), ...args);
    },
    warn(...args) {
      console.warn(prefix(), ...args);
    },
    error(...args) {
      console.error(prefix(), ...args);
    },
    child(childScope) {
      const merged = [scope, childScope].filter(Boolean).join(':');
      return createLogger(merged);
    },
  };
}

module.exports = { createLogger };

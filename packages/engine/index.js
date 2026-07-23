// @sworbl/engine — aggregate entry. Each module is dual IIFE/CommonJS and can
// also be required individually: require('@sworbl/engine/sworble-core.js').
module.exports = {
  core: require('./sworble-core.js'),
  seed: require('./sworble-seed.js'),
  solver: require('./sworble-solver.js'),
  daily: require('./sworble-daily.js'),
  status: require('./sworble-status.js'),
  flow: require('./sworble-flow.js'),
  run: require('./sworble-run.js'),
  store: require('./sworble-store.js'),
  net: require('./sworble-net.js'),
  words: require('./words.js'),
};

const kleur = require('kleur');

const prefix = kleur.magenta('[neha]');

module.exports = {
  info: (...args) => console.log(prefix, ...args),
  warn: (...args) => console.warn(prefix, kleur.yellow('WARN'), ...args),
  error: (...args) => console.error(prefix, kleur.red('ERROR'), ...args),
  success: (...args) => console.log(prefix, kleur.green('✔'), ...args),
};

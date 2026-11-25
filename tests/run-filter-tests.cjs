const F = require('../sebfilter.js');
const path = require("path");
const cases = require(process.argv[2] ? path.resolve(process.argv[2]) : "./seb-win-simplified-rule-cases.json");
let pass = 0, fail = 0;
for (const c of cases) {
  let t; try { t = F.simplifiedRule(c.expression); } catch (e) { console.log('INIT FAIL', c.name, e.message); fail++; continue; }
  for (const u of c.positive) { let r; try { r = t(u); } catch (e) { r = 'ERR ' + e.message; } if (r === true) pass++; else { fail++; console.log('FAIL+', c.name, c.expression, u, r); } }
  for (const u of c.negative) { let r; try { r = t(u); } catch (e) { r = 'ERR ' + e.message; } if (r === false) pass++; else { fail++; console.log('FAIL-', c.name, c.expression, u, r); } }
}
console.log(cases.length, 'tests', pass, 'pass', fail, 'fail');

const fs = require('fs');
let types = fs.readFileSync('src/types.ts', 'utf8');
if(!types.includes("'HOLIDAYS'")) {
  types = types.replace("| 'LEAVES'", "| 'LEAVES'\n  | 'HOLIDAYS'");
  fs.writeFileSync('src/types.ts', types);
}

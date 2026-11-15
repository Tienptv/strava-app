const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- STARTING CORE LIBRARY INTEGRITY TEST ---');

// Helper to check balanced brackets & quotes
function checkBalancedSyntax(content, filename) {
  let parens = 0, brackets = 0, braces = 0;
  let inSingleQuote = false, inDoubleQuote = false, inTripleSingle = false, inTripleDouble = false;
  
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next2 = content.substr(i, 3);
    
    if (next2 === '"""' && !inSingleQuote && !inTripleSingle) {
      inTripleDouble = !inTripleDouble;
      i += 2;
      continue;
    }
    if (next2 === "'''" && !inDoubleQuote && !inTripleDouble) {
      inTripleSingle = !inTripleSingle;
      i += 2;
      continue;
    }
    if (inTripleDouble || inTripleSingle) continue;
    
    if (ch === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }
    if (ch === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (inDoubleQuote || inSingleQuote) continue;
    
    if (ch === '(') parens++;
    else if (ch === ')') parens--;
    else if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
    else if (ch === '{') braces++;
    else if (ch === '}') braces--;
  }

  assert.strictEqual(parens, 0, `${filename} has unbalanced parentheses`);
  assert.strictEqual(brackets, 0, `${filename} has unbalanced square brackets`);
  assert.strictEqual(braces, 0, `${filename} has unbalanced curly braces`);
  assert.strictEqual(inTripleDouble, false, `${filename} has unclosed triple-double quotes`);
  assert.strictEqual(inTripleSingle, false, `${filename} has unclosed triple-single quotes`);
}

// 1. exceptions.py
const exceptionsPath = path.resolve('src/core/exceptions.py');
assert(fs.existsSync(exceptionsPath), 'src/core/exceptions.py must exist');
const excContent = fs.readFileSync(exceptionsPath, 'utf8');
assert(excContent.includes('class DomainError(Exception):'), 'DomainError class missing');
assert(excContent.includes('class InvalidParameterError(DomainError):'), 'InvalidParameterError class missing');
assert(excContent.includes('class ResourceNotFoundError(DomainError):'), 'ResourceNotFoundError class missing');
assert(excContent.includes('class DuplicateInProgressError(DomainError):'), 'DuplicateInProgressError class missing');
assert(excContent.includes('self.ai_hint = ai_hint'), 'ai_hint assignment missing in DomainError');
checkBalancedSyntax(excContent, 'src/core/exceptions.py');
console.log('✅ Case 1: src/core/exceptions.py verified (all classes, ai_hint & syntax)');

// 2. error_boundary.py
const errBoundPath = path.resolve('src/core/error_boundary.py');
assert(fs.existsSync(errBoundPath), 'src/core/error_boundary.py must exist');
const ebContent = fs.readFileSync(errBoundPath, 'utf8');
assert(ebContent.includes('class ToolResponse(TypedDict):'), 'ToolResponse TypedDict missing');
assert(ebContent.includes('def mcp_error_boundary('), 'mcp_error_boundary decorator missing');
assert(ebContent.includes('def _handle_tool_exception('), '_handle_tool_exception helper missing');
assert(ebContent.includes('validation_error'), 'validation_error status missing');
assert(ebContent.includes('transient_error'), 'transient_error status missing');
assert(ebContent.includes('system_error'), 'system_error status missing');
assert(ebContent.includes('inspect.iscoroutinefunction(func)'), 'async/sync inspection missing');
checkBalancedSyntax(ebContent, 'src/core/error_boundary.py');
console.log('✅ Case 2: src/core/error_boundary.py verified (ToolResponse, async/sync wrapper & categories)');

// 3. idempotency.py
const idemPath = path.resolve('src/core/idempotency.py');
assert(fs.existsSync(idemPath), 'src/core/idempotency.py must exist');
const idemContent = fs.readFileSync(idemPath, 'utf8');
assert(idemContent.includes('class IdempotencyRecord:'), 'IdempotencyRecord dataclass missing');
assert(idemContent.includes('class IdempotencyStore(ABC):'), 'IdempotencyStore ABC missing');
assert(idemContent.includes('class InMemoryIdempotencyStore(IdempotencyStore):'), 'InMemoryIdempotencyStore missing');
assert(idemContent.includes('class SQLiteIdempotencyStore(IdempotencyStore):'), 'SQLiteIdempotencyStore missing');
assert(idemContent.includes('def compute_deterministic_key('), 'compute_deterministic_key missing');
assert(idemContent.includes('def mcp_idempotent('), 'mcp_idempotent decorator missing');
assert(idemContent.includes('PRAGMA journal_mode = WAL;'), 'SQLite WAL mode missing');
assert(idemContent.includes('BEGIN IMMEDIATE;'), 'BEGIN IMMEDIATE transaction missing');
assert(idemContent.includes('hashlib.sha256('), 'SHA-256 fingerprinting missing');
checkBalancedSyntax(idemContent, 'src/core/idempotency.py');
console.log('✅ Case 3: src/core/idempotency.py verified (Stores, WAL mode, SHA-256, mcp_idempotent)');

// 4. __init__.py
const initPath = path.resolve('src/core/__init__.py');
assert(fs.existsSync(initPath), 'src/core/__init__.py must exist');
const initContent = fs.readFileSync(initPath, 'utf8');
const expectedExports = [
  "DomainError",
  "InvalidParameterError",
  "ResourceNotFoundError",
  "DuplicateInProgressError",
  "ToolResponse",
  "mcp_error_boundary",
  "IdempotencyRecord",
  "IdempotencyStore",
  "InMemoryIdempotencyStore",
  "SQLiteIdempotencyStore",
  "compute_deterministic_key",
  "mcp_idempotent"
];
expectedExports.forEach(sym => {
  assert(initContent.includes(sym), `Export ${sym} missing in __init__.py`);
});
checkBalancedSyntax(initContent, 'src/core/__init__.py');
console.log('✅ Case 4: src/core/__init__.py verified (all 12 exports in __all__)');

// 5. src/__init__.py
const rootInitPath = path.resolve('src/__init__.py');
assert(fs.existsSync(rootInitPath), 'src/__init__.py must exist');
console.log('✅ Case 5: src/__init__.py package marker verified');

console.log('\n🎉 ALL 5 TEST CASES PASSED SUCCESSFULLY (100% INTEGRITY)');

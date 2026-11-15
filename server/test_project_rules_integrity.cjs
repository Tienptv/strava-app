const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- STARTING PROJECT RULES INTEGRITY TEST ---');

// 1. Kiểm tra file .cursor/rules/01-clean-code-domain.mdc
const f1Path = path.resolve('.cursor/rules/01-clean-code-domain.mdc');
assert(fs.existsSync(f1Path), '01-clean-code-domain.mdc must exist');
const f1 = fs.readFileSync(f1Path, 'utf8');
assert(f1.includes('globs: src/domain/**/*.py'), 'f1 must target src/domain/**/*.py');
assert(f1.includes('alwaysApply: true'), 'f1 must have alwaysApply: true');
assert(f1.includes('Guard Clauses & Early Return'), 'f1 must define Guard Clauses');
assert(f1.includes('Lookup Table hoặc Strategy Pattern'), 'f1 must define Strategy Pattern');
assert(f1.includes('Dependency Injection (DI)'), 'f1 must define DI');
assert(f1.includes('Single Level of Abstraction (SLA)'), 'f1 must define SLA');
assert(f1.includes('The Stepdown Rule'), 'f1 must define Stepdown Rule');
console.log('✅ Case 1: .cursor/rules/01-clean-code-domain.mdc verified 100%');

// 2. Kiểm tra file .cursor/rules/02-mcp-adapter.mdc
const f2Path = path.resolve('.cursor/rules/02-mcp-adapter.mdc');
assert(fs.existsSync(f2Path), '02-mcp-adapter.mdc must exist');
const f2 = fs.readFileSync(f2Path, 'utf8');
assert(f2.includes('globs: src/mcp_server/**/*.py'), 'f2 must target src/mcp_server/**/*.py');
assert(f2.includes('alwaysApply: true'), 'f2 must have alwaysApply: true');
assert(f2.includes('@mcp_error_boundary'), 'f2 must define @mcp_error_boundary');
assert(f2.includes('@mcp_idempotent'), 'f2 must define @mcp_idempotent');
assert(f2.includes('Mô hình Tảng băng chìm'), 'f2 must define iceberg pattern');
console.log('✅ Case 2: .cursor/rules/02-mcp-adapter.mdc verified 100%');

// 3. Kiểm tra file CLAUDE.md
const claudePath = path.resolve('CLAUDE.md');
assert(fs.existsSync(claudePath), 'CLAUDE.md must exist');
const claude = fs.readFileSync(claudePath, 'utf8');
assert(claude.includes('PHẦN 1: QUY CHUẨN THIẾT KẾ CODE TẦNG DOMAIN'), 'CLAUDE.md must have Part 1');
assert(claude.includes('PHẦN 2: QUY CHUẨN ĐÓNG GÓI MCP TOOL'), 'CLAUDE.md must have Part 2');
console.log('✅ Case 3: CLAUDE.md verified 100%');

// 4. Kiểm tra file GEMINI.md
const geminiPath = path.resolve('GEMINI.md');
assert(fs.existsSync(geminiPath), 'GEMINI.md must exist');
const gemini = fs.readFileSync(geminiPath, 'utf8');
assert(gemini.includes('## 10. Quy Chuẩn Thiết Kế Code Tầng Domain'), 'GEMINI.md must have Section 10');
assert(gemini.includes('## 11. Quy Chuẩn Đóng Gói MCP Tool'), 'GEMINI.md must have Section 11');
console.log('✅ Case 4: GEMINI.md verified 100%');

// 5. Kiểm tra file AGENTS.md
const agentsPath = path.resolve('AGENTS.md');
assert(fs.existsSync(agentsPath), 'AGENTS.md must exist');
const agents = fs.readFileSync(agentsPath, 'utf8');
assert(agents.includes('9. **Quy Chuẩn Thiết Kế Code Tầng Domain'), 'AGENTS.md must have item 9');
assert(agents.includes('10. **Quy Chuẩn Đóng Gói MCP Tool'), 'AGENTS.md must have item 10');
console.log('✅ Case 5: AGENTS.md verified 100%');

// 6. Kiểm tra file .agents/rules/
const a1Path = path.resolve('.agents/rules/01-clean-code-domain.md');
const a2Path = path.resolve('.agents/rules/02-mcp-adapter.md');
assert(fs.existsSync(a1Path), '.agents/rules/01-clean-code-domain.md must exist');
assert(fs.existsSync(a2Path), '.agents/rules/02-mcp-adapter.md must exist');
console.log('✅ Case 6: .agents/rules/ modular files verified 100%');

console.log('\n🎉 ALL 6 TEST CASES PASSED SUCCESSFULLY!');

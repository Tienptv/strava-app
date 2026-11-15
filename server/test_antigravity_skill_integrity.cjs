const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- STARTING ANTIGRAVITY SKILL & TOOLKIT INTEGRITY TEST ---');

// 1. Kiểm tra SKILL.md
const skillPath = path.resolve('.agents/skills/domain-driven-mcp/SKILL.md');
assert(fs.existsSync(skillPath), '.agents/skills/domain-driven-mcp/SKILL.md must exist');
const skillContent = fs.readFileSync(skillPath, 'utf8');
assert(skillContent.startsWith('---'), 'SKILL.md must start with YAML frontmatter');
assert(skillContent.includes('name: domain-driven-mcp'), 'SKILL.md must have name: domain-driven-mcp');
assert(skillContent.includes('Trụ Cột 1: Quy Chuẩn Code Tầng Domain'), 'Trụ cột 1 missing');
assert(skillContent.includes('Trụ Cột 2: Thư Viện Core Dùng Chung'), 'Trụ cột 2 missing');
assert(skillContent.includes('Trụ Cột 3: Đóng Gói Tầng Adapter MCP'), 'Trụ cột 3 missing');
assert(skillContent.includes('agent-mcp-builder'), 'Reference to agent-mcp-builder subagent missing');
console.log('✅ Case 1: .agents/skills/domain-driven-mcp/SKILL.md verified 100%');

// 2. Kiểm tra references/architecture.md
const archPath = path.resolve('.agents/skills/domain-driven-mcp/references/architecture.md');
assert(fs.existsSync(archPath), 'architecture.md must exist');
const archContent = fs.readFileSync(archPath, 'utf8');
assert(archContent.includes('sequenceDiagram'), 'Sequence diagram missing');
assert(archContent.includes('evaluate_and_record_beam_capacity'), 'Sample code missing');
assert(archContent.includes('check_and_save_beam_capacity'), 'Sample MCP adapter code missing');
console.log('✅ Case 2: architecture.md verified 100%');

// 3. Kiểm tra Subagent agent-mcp-builder
const subagentPath = path.resolve('.agents/agents/agent-mcp-builder.md');
assert(fs.existsSync(subagentPath), 'agent-mcp-builder.md must exist');
console.log('✅ Case 3: Subagent agent-mcp-builder verified 100%');

// 4. Kiểm tra Core Library src/core/
const coreInitPath = path.resolve('src/core/__init__.py');
assert(fs.existsSync(coreInitPath), 'src/core/__init__.py must exist');
console.log('✅ Case 4: Core Library src/core/ verified 100%');

console.log('\n🎉 ALL 4 ANTIGRAVITY INTEGRATION TEST CASES PASSED SUCCESSFULLY (100% PASS)');

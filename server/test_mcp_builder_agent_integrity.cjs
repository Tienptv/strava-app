const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- STARTING MCP BUILDER AGENT INTEGRITY TEST ---');

// 1. .claude/commands/build-mcp-tool.md
const claudeCmdPath = path.resolve('.claude/commands/build-mcp-tool.md');
assert(fs.existsSync(claudeCmdPath), '.claude/commands/build-mcp-tool.md must exist');
const claudeContent = fs.readFileSync(claudeCmdPath, 'utf8');
assert(claudeContent.includes('ROLE: Principal Software Architect & MCP Tool Builder'), 'Claude command role missing');
assert(claudeContent.includes('BƯỚC 1: Chẩn đoán Thiết kế'), 'Step 1 missing');
assert(claudeContent.includes('BƯỚC 2: Tái cấu trúc Tầng Domain'), 'Step 2 missing');
assert(claudeContent.includes('BƯỚC 3: Đóng gói Tầng MCP Adapter'), 'Step 3 missing');
assert(claudeContent.includes('BƯỚC 4: Kiểm thử & Nghiệm thu'), 'Step 4 missing');
console.log('✅ Case 1: .claude/commands/build-mcp-tool.md verified (all 4 steps)');

// 2. .cursor/rules/agent-mcp-builder.mdc
const cursorRulePath = path.resolve('.cursor/rules/agent-mcp-builder.mdc');
assert(fs.existsSync(cursorRulePath), '.cursor/rules/agent-mcp-builder.mdc must exist');
const cursorContent = fs.readFileSync(cursorRulePath, 'utf8');
assert(cursorContent.includes('alwaysApply: false'), 'alwaysApply: false must be set');
assert(cursorContent.includes('globs: src/**/*.py'), 'globs must target src/**/*.py');
assert(cursorContent.includes('BƯỚC 1: Chẩn đoán Thiết kế'), 'Step 1 missing in cursor');
assert(cursorContent.includes('BƯỚC 2: Tái cấu trúc Tầng Domain'), 'Step 2 missing in cursor');
assert(cursorContent.includes('BƯỚC 3: Đóng gói Tầng MCP Adapter'), 'Step 3 missing in cursor');
assert(cursorContent.includes('BƯỚC 4: Kiểm thử & Nghiệm thu'), 'Step 4 missing in cursor');
console.log('✅ Case 2: .cursor/rules/agent-mcp-builder.mdc verified (alwaysApply: false & 4 steps)');

// 3. .github/prompts/build-mcp-tool.prompt.md
const copilotPromptPath = path.resolve('.github/prompts/build-mcp-tool.prompt.md');
assert(fs.existsSync(copilotPromptPath), '.github/prompts/build-mcp-tool.prompt.md must exist');
const copilotContent = fs.readFileSync(copilotPromptPath, 'utf8');
assert(copilotContent.includes('ROLE: Principal Software Architect & MCP Tool Builder'), 'Copilot role missing');
assert(copilotContent.includes('BƯỚC 1: Chẩn đoán Thiết kế'), 'Step 1 missing in copilot');
assert(copilotContent.includes('BƯỚC 4: Kiểm thử & Nghiệm thu'), 'Step 4 missing in copilot');
console.log('✅ Case 3: .github/prompts/build-mcp-tool.prompt.md verified (prompt template)');

// 4. .agents/agents/agent-mcp-builder.md
const agenticPath = path.resolve('.agents/agents/agent-mcp-builder.md');
assert(fs.existsSync(agenticPath), '.agents/agents/agent-mcp-builder.md must exist');
const agenticContent = fs.readFileSync(agenticPath, 'utf8');
assert(agenticContent.includes('name: agent-mcp-builder'), 'name frontmatter missing');
assert(agenticContent.includes('BƯỚC 1: Chẩn đoán Thiết kế'), 'Step 1 missing in antigravity agent');
assert(agenticContent.includes('BƯỚC 4: Kiểm thử & Nghiệm thu'), 'Step 4 missing in antigravity agent');
console.log('✅ Case 4: .agents/agents/agent-mcp-builder.md verified (Antigravity subagent format)');

console.log('\n🎉 ALL 4 AGENT CONFIGURATION TEST CASES PASSED SUCCESSFULLY (100% PASS)');

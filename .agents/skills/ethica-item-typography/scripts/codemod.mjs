#!/usr/bin/env node
// A conversão antiga emitia props tipográficas removidas pela AD-087.
// Mantemos este caminho para avisar quem tenta repetir aquela migração.
console.error('O codemod de tipografia foi aposentado pela AD-087. Use ItemTitle/ItemDescription com classes locais.');
process.exitCode = 1;

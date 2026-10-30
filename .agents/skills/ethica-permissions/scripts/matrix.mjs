#!/usr/bin/env node
// Matriz de permissões lida do código (fonte da verdade): rota da API → guardas,
// e pontos de checagem de papel no apps/web. Uso, da raiz do repo:
//   node .agents/skills/ethica-permissions/scripts/matrix.mjs          # API + web
//   node .agents/skills/ethica-permissions/scripts/matrix.mjs api      # só API
//   node .agents/skills/ethica-permissions/scripts/matrix.mjs web      # só web
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const only = process.argv[2];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const walk = (dir) =>
  fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(rel);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [rel] : [];
  });

const GUARD = /validToken|tenantAssignmentCheck|isAdmin|isManager|isOperator|platformAdminOnly|checkRole|^can[A-Z]\w*$|^\.\.\.\w+$/;

const api = () => {
  const appSrc = read('apps/api/src/app.ts');
  const mounts = new Map();
  for (const m of appSrc.matchAll(/app\.use\(\s*'([^']+)',\s*(\w+Router)\b/g)) mounts.set(m[2], m[1]);

  const modulesDir = 'apps/api/src/modules';
  const routers = walk(modulesDir).filter((file) => file.endsWith('.router.ts'));
  console.log('# API — rota → guardas (apps/api/src/modules/*/*.router.ts)\n');
  console.log('Sem guarda de papel depois de tenantAssignmentCheck = qualquer usuário do tenant, inclusive role: [].\n');

  for (const file of routers.sort()) {
    const src = read(file);
    // `const canOperate = checkRole([...])` e `const guards = [...]`: expande o alias na saída.
    const aliases = new Map(
      [...src.matchAll(/const (\w+) = (checkRole\(\[[^\]]*\]\)|\[(?:[^[\]]|\[[^\]]*\])*\]);/g)].map((m) => [m[1], m[2].replace(/\s+/g, ' ')]),
    );
    const expand = (guard) => {
      const name = guard.replace(/^\.\.\./, '');
      const value = aliases.get(name);
      if (!value) return [guard];
      if (value.startsWith('checkRole')) return [value];
      return value.slice(1, -1).split(/,(?![^(]*\))/).map((g) => g.trim()).flatMap(expand);
    };

    // Um arquivo pode exportar mais de um router (operations.router.ts): cada um tem o próprio prefixo.
    for (const segment of src.split(/(?=export const \w+)/).filter((s) => s.startsWith('export const'))) {
      const name = segment.match(/export const (\w+)/)[1];
      const prefix = mounts.get(name) ?? `? (${name} não montado em app.ts)`;
      const routes = [...segment.matchAll(/\b\w*[rR]outer\.(get|post|put|patch|delete|use)\(\s*([\s\S]*?)\);\n/g)];
      if (!routes.length) continue;
      console.log(`## ${prefix}  (${path.relative(root, file)} → ${name})`);

      let shared = [];
      for (const m of routes) {
        const args = m[2].replace(/\s+/g, ' ').split(/,(?![^(]*\))/).map((arg) => arg.trim()).filter(Boolean);
        const guards = args
          .map((arg) => arg.replace(/^deps\./, ''))
          .filter((arg) => GUARD.test(arg))
          .flatMap(expand);
        if (m[1] === 'use') {
          shared = [...shared, ...guards];
          continue;
        }
        const all = [
          ...new Set([...shared, ...guards].map((g) => g.replace(/^deps\./, '').replace(/checkRole\(\[(.*)\]\)/, 'checkRole($1)'))),
        ];
        const route = `${prefix}${args[0].replace(/'/g, '').replace(/^\/$/, '')}`;
        console.log(`   ${m[1].toUpperCase().padEnd(6)} ${route}  →  ${all.join(' ') || 'PÚBLICO'}`);
      }
      console.log('');
    }
  }

  console.log('# API — checagens de papel dentro de services (regra por recurso/dono)\n');
  for (const file of walk(modulesDir).filter((f) => f.endsWith('.service.ts')).sort()) {
    read(file)
      .split('\n')
      .forEach((line, i) => {
        if (/role\.(some|includes)|isManager\(|isAdmin\(|no_permission/.test(line)) {
          console.log(`   ${path.relative(root, file)}:${i + 1}  ${line.trim()}`);
        }
      });
  }
  console.log('');
};

const web = () => {
  console.log('# Web — checagens de papel (apps/web/src)\n');
  for (const file of walk('apps/web/src').filter((f) => !f.includes('translate.helper')).sort()) {
    read(file)
      .split('\n')
      .forEach((line, i) => {
        if (/isAdminSession\(|session\.role|\.role\.(some|includes)|access: '|throw redirect/.test(line)) {
          console.log(`   ${path.relative(root, file)}:${i + 1}  ${line.trim()}`);
        }
      });
  }
};

if (only !== 'web') api();
if (only !== 'api') web();

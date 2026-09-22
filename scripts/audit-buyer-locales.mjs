import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const source = (file) =>
  ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
const normalize = (value) => value.trim().replace(/\s+/g, ' ');

function objectProperties(node) {
  const object = ts.isAsExpression(node) ? node.expression : node;
  return ts.isObjectLiteralExpression(object) ? object.properties : [];
}

function findDeclaration(tree, name) {
  let result;
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === name)
      result = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return result;
}

const base = source('components/buyer-preferences.tsx');
const baseLocales = new Map();
for (const locale of objectProperties(findDeclaration(base, 'messages'))) {
  if (!ts.isPropertyAssignment(locale)) continue;
  baseLocales.set(
    locale.name.getText(base),
    new Set(
      objectProperties(locale.initializer).map((entry) => entry.name?.text),
    ),
  );
}

const extra = source('components/buyer-page-translations.ts');
const extraKeys = new Set();
const addPhrases = (object) => {
  for (const entry of objectProperties(object))
    if (ts.isPropertyAssignment(entry)) extraKeys.add(entry.name.text);
};
addPhrases(findDeclaration(extra, 'phrases'));
const walkExtra = (node) => {
  if (
    ts.isCallExpression(node) &&
    node.expression.getText(extra) === 'Object.assign' &&
    node.arguments[0]?.getText(extra) === 'phrases'
  )
    addPhrases(node.arguments[1]);
  ts.forEachChild(node, walkExtra);
};
walkExtra(extra);

const files = [];
function collect(folder) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) {
      if (!['ui', 'api'].includes(entry.name)) collect(path);
    } else if (
      path.endsWith('.tsx') &&
      !/(?:^|\/)(?:admin|developer)-/.test(path) &&
      path !== 'components/buyer-preferences.tsx'
    )
      files.push(path);
  }
}
collect('app');
collect('components');

const missing = new Map();
for (const file of files) {
  const tree = source(file);
  const visit = (node) => {
    if (
      (ts.isJsxText(node) ||
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node)) &&
      /[А-Яа-яЁё]/.test(node.text)
    ) {
      const text = normalize(node.text);
      if (
        text.length > 1 &&
        !extraKeys.has(text) &&
        (!baseLocales.get('uz')?.has(text) || !baseLocales.get('en')?.has(text))
      ) {
        if (!missing.has(file)) missing.set(file, new Set());
        missing.get(file).add(text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
}

if (missing.size) {
  for (const [file, phrases] of missing)
    for (const phrase of phrases) console.error(`${file}: ${phrase}`);
  process.exitCode = 1;
} else {
  console.log(
    `Buyer locale audit passed: ${files.length} pages and components, ${extraKeys.size} additional phrases.`,
  );
}

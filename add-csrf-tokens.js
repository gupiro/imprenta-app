#!/usr/bin/env node
/**
 * Script para añadir automáticamente tokens CSRF a todos los formularios POST en las vistas
 * Usage: node add-csrf-tokens.js
 */

const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else if (filePath.endsWith('.ejs')) {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

function addCsrfTokenToForm(content) {
  // Buscar todos los formularios POST que no tengan token CSRF
  const csrfTokenRegex = /name="_csrf"/;
  const formRegex = /<form[^>]*method="POST"[^>]*>/gi;

  let modified = false;
  let result = content;

  let match;
  while ((match = formRegex.exec(content)) !== null) {
    const formTag = match[0];

    // Verificar si ya tiene un token CSRF
    if (csrfTokenRegex.test(content.substring(match.index, match.index + 500))) {
      continue;
    }

    // Agregar el token CSRF después de la etiqueta de apertura del formulario
    const insertPos = match.index + formTag.length;
    const csrfField = '\n  <input type="hidden" name="_csrf" value="<%= csrfToken %>">';

    result = result.substring(0, insertPos) + csrfField + result.substring(insertPos);
    modified = true;

    // Ajustar la posición para la siguiente búsqueda
    content = result;
    formRegex.lastIndex = 0;
  }

  return { result, modified };
}

const viewsPath = path.join(__dirname, 'views');
const files = getAllFiles(viewsPath);

let filesModified = 0;
let formsAdded = 0;

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  const { result, modified } = addCsrfTokenToForm(content);

  if (modified) {
    fs.writeFileSync(filePath, result, 'utf8');
    filesModified++;
    const formMatches = result.match(/<input type="hidden" name="_csrf"/g);
    if (formMatches) {
      formsAdded += formMatches.length;
    }
    console.log(`✅ ${path.relative(__dirname, filePath)}`);
  }
});

console.log(`\n✨ Completado:`);
console.log(`   - ${filesModified} archivos modificados`);
console.log(`   - ${formsAdded} tokens CSRF agregados`);
console.log(`\n⚠️  Revisa manualmente los cambios para asegurar que estén correctos.`);

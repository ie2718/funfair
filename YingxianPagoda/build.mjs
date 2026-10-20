import { build } from 'esbuild';
import fs from 'node:fs';
const result = await build({entryPoints:['model.js'],bundle:true,format:'iife',minify:true,write:false,legalComments:'eof'});
const html = fs.readFileSync('template.html','utf8').replace('/* BUNDLE */', () => result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script'));
fs.writeFileSync('index.html',html.replace(/[ \t]+$/gm, ''));
console.log('Built offline index.html');

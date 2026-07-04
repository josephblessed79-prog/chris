// Extract readable text from a .docx: paragraphs and tables (cells separated by |)
const { execSync } = require('child_process');
const path = process.argv[2];
const xml = execSync(`unzip -p "${path}" word/document.xml`, {maxBuffer: 64*1024*1024}).toString('utf8');
function textOf(s){ // concatenate w:t runs, honour tabs and breaks
  let out='';
  const re=/<w:(t|tab|br|noBreakHyphen)(?:\s[^>]*)?(?:\/>|>([\s\S]*?)<\/w:t>)/g; let m;
  while((m=re.exec(s))){ if(m[1]==='t') out+= (m[2]||'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'"); else if(m[1]==='tab') out+='\t'; else if(m[1]==='br') out+='\n'; else out+='-'; }
  return out;
}
// walk top-level body children
const body = xml.slice(xml.indexOf('<w:body'), xml.indexOf('</w:body>'));
let i=0, out=[];
const tokRe=/<w:(p|tbl)(?:\s[^>]*)?>/g; let m2;
// simpler: split tables out first
let rest=body;
const parts=[];
const tblRe=/<w:tbl>[\s\S]*?<\/w:tbl>/g;
let last=0;
while((m2=tblRe.exec(body))){ parts.push({t:'x',s:body.slice(last,m2.index)}); parts.push({t:'tbl',s:m2[0]}); last=m2.index+m2[0].length; }
parts.push({t:'x',s:body.slice(last)});
for(const part of parts){
  if(part.t==='x'){
    const pRe=/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g; let pm;
    while((pm=pRe.exec(part.s))){ const t=textOf(pm[1]); out.push(t); }
  } else {
    out.push('====TABLE====');
    const rRe=/<w:tr(?:\s[^>]*)?>([\s\S]*?)<\/w:tr>/g; let rm;
    while((rm=rRe.exec(part.s))){
      const cells=[]; const cRe=/<w:tc(?:\s[^>]*)?>([\s\S]*?)<\/w:tc>/g; let cm;
      while((cm=cRe.exec(rm[1]))){ cells.push(textOf(cm[1]).replace(/\n/g,' / ')); }
      out.push('| '+cells.join(' | ')+' |');
    }
    out.push('====END TABLE====');
  }
}
console.log(out.join('\n'));

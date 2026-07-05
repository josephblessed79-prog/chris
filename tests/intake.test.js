/* intake.test.js — the Document Upload / Intake engine: file-kind and
   honest support matrix, structure analysis, conflict detection against
   the official templates (official always wins), the compliance-bounded
   layout plan, extraction summary (uncertain stays uncertain), and the
   audit record. */
'use strict';

const t = require('./harness.js');
const intake = require('../js/lib/intake.js');
const cm = require('../js/lib/casemodel.js');

const NOW = '2026-07-05T09:00:00.000Z';

t.test('file kinds are detected, including scanned vs text PDF', () => {
  t.eq(intake.fileKind('quote.docx'), 'docx');
  t.eq(intake.fileKind('data.csv'), 'csv');
  t.eq(intake.fileKind('book.xlsx'), 'xlsx');
  t.eq(intake.fileKind('report.pdf', 'application/pdf', true), 'pdf-text');
  t.eq(intake.fileKind('scan.pdf', 'application/pdf', false), 'pdf-scanned');
  t.eq(intake.fileKind('note.rtf'), 'unknown');
});

t.test('the support matrix is honest about each file type', () => {
  t.eq(intake.supportFor('docx').info, true);
  t.eq(intake.supportFor('docx').structure, true);
  t.eq(intake.supportFor('pdf-text').structure, 'limited');
  t.eq(intake.supportFor('pdf-scanned').info, false, 'scanned PDF is not readable without OCR');
  t.ok(/OCR/.test(intake.supportFor('pdf-scanned').note));
  t.eq(intake.supportFor('xlsx').structure, false, 'a spreadsheet has no document layout');
  t.eq(intake.supportFor('csv').info, true);
});

t.test('every intake mode has a plain-language explanation', () => {
  for (const k of ['A', 'B', 'C']) {
    t.ok(intake.MODES[k].plain.length > 20, 'mode ' + k + ' explained plainly');
    t.ok(intake.MODES[k].label.length > 5);
  }
});

t.test('structure analysis normalises headings and tables', () => {
  const p = intake.analyzeStructure({
    headings: [' Introduction ', 'Background', ''],
    tables: [{ columns: ['Item', ' Qty ', ''], rowCount: 3 }],
    paragraphs: ['a', 'b'],
    hasSignatureBlocks: true, hasLetterhead: true
  });
  t.eq(p.sectionOrder, ['Introduction', 'Background']);
  t.eq(p.tables[0].columns, ['Item', 'Qty']);
  t.eq(p.hasSignatureBlocks, true);
  t.eq(p.sectionCount, 2);
});

t.test('conflict detection: a missing mandated section is a blocking conflict, official wins', () => {
  const official = intake.officialStructureFor('disposal');
  // upload has only two of the mandated Form D sections
  const profile = intake.analyzeStructure({ headings: ['Executive Summary', 'Market Analysis'] });
  const conflicts = intake.detectConflicts(profile, official);
  const blocks = conflicts.filter(c => c.severity === 'block');
  t.ok(blocks.length >= 1, 'missing mandated sections are blocking');
  t.ok(blocks.every(c => /kept/.test(c.resolution)), 'resolution keeps the official template');
  t.ok(blocks.some(c => /Stakeholder Analysis/.test(c.field)), 'the missing Stakeholder Analysis is flagged');
});

t.test('conflict detection: an extra uploaded section is noted, not applied', () => {
  const official = intake.officialStructureFor('disposal');
  const profile = intake.analyzeStructure({
    headings: ['Executive Summary', 'Disposal Requirement Analysis', 'Stakeholder Analysis',
      'Market Analysis', 'Disposal Strategy Options', 'Preferred Disposal Strategy Recommendation',
      'Chairman’s Personal Notes']
  });
  const conflicts = intake.detectConflicts(profile, official);
  const notes = conflicts.filter(c => c.severity === 'note');
  t.ok(notes.some(c => /Personal Notes/.test(c.field)), 'the extra section is noted');
  t.ok(!conflicts.some(c => c.severity === 'block'), 'no blocking conflict when all mandated sections are present');
});

t.test('layout plan for information-only mode changes nothing', () => {
  const plan = intake.planLayout('A', 'docx', intake.analyzeStructure({ headings: ['X'] }), intake.officialStructureFor('disposal'));
  t.eq(plan.requested, false);
  t.eq(plan.applied, false);
  t.eq(plan.outputProfile, null);
});

t.test('layout plan for B on a DOCX applies the enhanced profile but keeps the official structure', () => {
  const official = intake.officialStructureFor('disposal');
  const profile = intake.analyzeStructure({
    headings: ['Executive Summary', 'Disposal Requirement Analysis', 'Stakeholder Analysis',
      'Market Analysis', 'Disposal Strategy Options', 'Preferred Disposal Strategy Recommendation'],
    hasSignatureBlocks: true, hasLetterhead: true
  });
  const plan = intake.planLayout('B', 'docx', profile, official);
  t.eq(plan.applied, true);
  t.eq(plan.outputProfile, 'enhanced');
  t.ok(/kept in full/.test(plan.note), 'the official layout is kept in full');
  t.ok(plan.applicableItems.indexOf('formal signature blocks') >= 0);
});

t.test('layout plan for B on a spreadsheet is refused honestly (no structure)', () => {
  const plan = intake.planLayout('B', 'xlsx', null, intake.officialStructureFor('routine'));
  t.eq(plan.applied, false);
  t.ok(/cannot provide layout structure/.test(plan.note));
});

t.test('extraction summary keeps uncertain facts out of the auto-fill set', () => {
  const s = intake.summarizeExtraction([
    { kind: 'supplier', label: 'Supplier', value: 'Acme Ltd', confidence: 'high' },
    { kind: 'figure', label: 'Amount', value: '$1,200.00', confidence: 'high' },
    { kind: 'date', label: 'Date', value: 'maybe 2026?', confidence: 'low' }
  ]);
  t.eq(s.facts.length, 2, 'only high-confidence facts are proposed');
  t.eq(s.uncertain.length, 1, 'the uncertain one is held for review');
  t.ok(/held for your review/.test(s.summaryText));
});

t.test('the audit record captures mode, file, extraction, layout decision, conflicts, confirmation', () => {
  const official = intake.officialStructureFor('disposal');
  const profile = intake.analyzeStructure({ headings: ['Executive Summary'] });
  const plan = intake.planLayout('C', 'docx', profile, official);
  const rec = intake.buildRecord({
    at: NOW, fileName: 'sample-disposal.docx', fileKind: 'docx', mode: 'C',
    extractionSummary: intake.summarizeExtraction([{ kind: 'supplier', value: 'X Ltd', confidence: 'high' }]),
    layoutDecision: plan, appliedFacts: [{ kind: 'supplier', value: 'X Ltd' }], confirmed: true
  });
  t.eq(rec.fileName, 'sample-disposal.docx');
  t.eq(rec.mode, 'C');
  t.ok(rec.modeLabel.length > 5);
  t.eq(rec.confirmed, true);
  t.eq(rec.confirmedAt, NOW);
  t.ok(rec.conflicts.length >= 1, 'conflicts are recorded on the case');
  t.eq(rec.support.info, true);
});

t.test('the case model carries outputProfile and an intake audit list', () => {
  const cf = cm.newCase('disposal', 'ministry-dotted', NOW);
  t.eq(cf.outputProfile, 'approved', 'approved layout by default');
  t.eq(cf.intake, []);
  t.eq(cm.validate(cf), []);
  cf.outputProfile = 'enhanced';
  cf.intake.push(intake.buildRecord({ at: NOW, fileName: 'x.docx', fileKind: 'docx', mode: 'A', confirmed: true }));
  t.eq(cm.validate(cf), [], 'enhanced profile and an intake record are valid');
  const back = JSON.parse(cm.serialize(cf));
  t.eq(back.intake.length, 1, 'the intake record round-trips through save/load');
  cf.outputProfile = 'sideways';
  t.ok(cm.validate(cf).some(e => /outputProfile/.test(e)));
});

t.test('an older v3 case without the new fields gains safe defaults on load', () => {
  const cf = cm.newCase('routine', 'ministry-dotted', NOW);
  delete cf.outputProfile;
  delete cf.intake;
  const loaded = cm.load(JSON.parse(cm.serialize(cf)), NOW);
  t.eq(loaded.ok, true);
  t.eq(loaded.caseFile.outputProfile, 'approved');
  t.eq(loaded.caseFile.intake, []);
});

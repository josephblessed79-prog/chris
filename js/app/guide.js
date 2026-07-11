/* guide.js — Guided Mode: each module as a step-by-step journey with a
   live preview of the actual output document. This is a presentation
   layer only: it reads and writes the same case file, through the same
   engines, as the full form view — it computes nothing itself and it
   invents nothing. The step definitions (ids, titles, completion rules,
   check-to-step mapping) are pure and run under Node for testing; the
   render functions run in the browser only.
   Loads in the browser as window.GUIDE and in Node via require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(null);
  } else {
    root.GUIDE = factory(root.MODPA);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (M) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------------- step definitions (pure; Node-testable) ------------- */
  /* Each step: id, title (a plain question), hint (one short sentence),
     checks (regexes of verification-check ids this step fixes),
     done(cf) -> boolean, render(cf) -> HTML (browser only). */

  function val(cf, path) {
    var p = String(path).split('.'), c = cf;
    for (var i = 0; i < p.length; i++) { if (c == null) return undefined; c = c[p[i]]; }
    return c;
  }
  function has(cf, path) { var v = val(cf, path); return v != null && String(v).trim() !== ''; }

  /* -- shared steps -- */
  function papersStep() {
    return {
      id: 'papers', optional: true,
      title: 'Have you papers to read in?',
      hint: 'Drop quotations, requisitions or lists here — the system reads them and you tick what to use. You can skip this and type everything instead.',
      checks: [],
      done: function () { return true; },
      render: function (cf) { return papersHTML(cf); }
    };
  }

  function signStep(extraChecks) {
    return {
      id: 'sign',
      title: 'Check and sign',
      hint: 'Anything still missing is listed below in plain words — the Go button takes you straight to it.',
      checks: [/^G4/].concat(extraChecks || []),
      done: function (cf) { return has(cf, 'docState.minsigname'); },
      render: function (cf) {
        var P = root().PANELS;
        var h = '<div class="grid">';
        h += P.fieldHTML('Signed by — name', 'docState.minsigname', { req: true });
        h += P.fieldHTML('Post (e.g. Clerk IV (Ag))', 'docState.minsigpost', {});
        h += '</div>';
        h += issuesHTML(cf);
        return h;
      }
    };
  }

  function docsStep() {
    return {
      id: 'docs',
      title: 'Your documents',
      hint: 'Everything below is built from your answers — figures computed, amounts written in words, folio numbers assigned.',
      checks: [],
      done: function () { return true; },
      render: function (cf) { return docsHTML(cf); }
    };
  }

  /* The "More options" block folded into every About step: style profile,
     starting folio (with the sheet-number question when it arises), and
     the document-layout profile. Out of the way, never in the way. */
  function moreOptionsHTML(cf) {
    var P = root().PANELS;
    var profiles = M.styleprofile.list().map(function (p) { return [p.id, p.name]; });
    var h = '<details class="gmore"><summary>More options — house style, folio numbering, layout</summary><div class="grid" style="margin-top:8px">';
    h += P.fieldHTML('House style profile', 'styleProfileId', { type: 'select', options: profiles });
    h += '<label class="f">Starting folio number<input type="number" min="1" step="1" data-special="folioStart" value="' + esc(String(cf.folioStart)) + '"></label>';
    h += '<label class="f">Document layout<select data-special="outputProfile">' +
      '<option value="approved"' + (cf.outputProfile !== 'enhanced' ? ' selected' : '') + '>Approved / official (default)</option>' +
      '<option value="enhanced"' + (cf.outputProfile === 'enhanced' ? ' selected' : '') + '>Enhanced professional</option></select></label>';
    h += '</div><div data-compute="sheet-number-box"></div></details>';
    return h;
  }

  function composerDetails(cf) {
    var P = root().PANELS;
    return '<details class="gmore"><summary>Help me write the background (offline composer)</summary>' + P.composerHTML(cf) + '</details>';
  }

  /* -- routine journey -- */
  function routineSteps() {
    return [
      {
        id: 'about',
        title: 'What is this purchase?',
        hint: 'Answer in the words that should appear on the papers.',
        checks: [/^G[1236]/, /^C(1|2|3|4|5)$/, /^C1[78]/, /^C22/],
        done: function (cf) { return has(cf, 'docState.subject') && has(cf, 'docState.minfile') && has(cf, 'docState.date'); },
        render: function (cf) {
          var P = root().PANELS;
          var h = '<div class="grid">';
          h += P.fieldHTML('Subject / title', 'docState.subject', { wide: true, req: true, placeholder: 'e.g. The Provision of Boxed Meals' });
          h += P.fieldHTML('File number', 'docState.minfile', { req: true, placeholder: 'e.g. MOD/PROC: 22/18/7:2026' });
          h += P.fieldHTML('Date', 'docState.date', { type: 'date', req: true });
          h += P.fieldHTML('In one sentence, what is being provided? (optional)', 'docState.subjectProse', { wide: true, placeholder: 'e.g. the provision of Boxed Meals for the Human Resource Training Workshop' });
          h += P.fieldHTML('Background / why it is needed (each blank-line-separated paragraph becomes a minute paragraph)', 'docState.need', { type: 'textarea', wide: true });
          h += P.fieldHTML('The suppliers are registered with the OPR’s Procurement Depository', 'oprRegistered', { type: 'checkbox', wide: true });
          h += '</div>';
          h += composerDetails(cf);
          h += moreOptionsHTML(cf);
          return h;
        }
      },
      papersStep(),
      {
        id: 'who',
        title: 'Who is this for?',
        hint: 'A Ministry section gets an internal minute; an outside formation (Coast Guard, Regiment, Police…) gets an approval letter as well.',
        checks: [],
        done: function () { return true; },
        render: function (cf) {
          var P = root().PANELS;
          var h = '<label class="f" style="display:block;margin:4px 0"><input type="radio" name="gpres" data-special="presentation" value="internal"' + (cf.presentation !== 'formation' ? ' checked' : '') + '> <b>A Ministry section</b> — internal minute only</label>';
          h += '<label class="f" style="display:block;margin:4px 0"><input type="radio" name="gpres" data-special="presentation" value="formation"' + (cf.presentation === 'formation' ? ' checked' : '') + '> <b>An outside formation</b> — approval letter + minute</label>';
          if (cf.presentation === 'formation') {
            h += '<fieldset class="box" style="margin-top:10px"><legend>The formation letter</legend><div class="grid">';
            h += P.fieldHTML('Letter file reference', 'docState.ref', { placeholder: 'e.g. CG: 5/4/7' });
            h += P.fieldHTML('Formation name (letterhead)', 'docState.formation', {});
            h += P.fieldHTML('Letterhead lines (one per line)', 'docState.lhlines', { type: 'textarea' });
            h += P.fieldHTML('Pre-printed letterhead (leave space instead of printing one)', 'docState.prelh', { type: 'checkbox' });
            h += P.fieldHTML('Addressee block (one line per line)', 'docState.addr', { type: 'textarea', wide: true });
            h += P.fieldHTML('Signature — name', 'docState.signame', {});
            h += P.fieldHTML('Signature — rank (optional)', 'docState.sigrank', {});
            h += P.fieldHTML('Signature — appointment', 'docState.sigapp', {});
            h += P.fieldHTML('Signature — formation line', 'docState.sigform', {});
            h += '</div></fieldset>';
          }
          return h;
        }
      },
      {
        id: 'prices',
        title: 'How did you get prices?',
        hint: 'Written quotations, telephone calls, or the fuller comparison worksheet — pick what actually happened and enter what each supplier said.',
        checks: [/^C(6|7|8|9|10|11|13|19)/, /^E/, /^V/],
        done: function (cf) {
          return !!((cf.docState.items && cf.docState.items.length) ||
            (cf.verbal && (cf.verbal.contacts.length || cf.verbal.schedule.length)) ||
            (cf.evaluation && cf.evaluation.items.length));
        },
        render: function (cf) {
          var P = root().PANELS;
          var h = '<div class="grid">';
          h += P.fieldHTML('Procurement method', 'docState.method', { type: 'select', options: ['Request for Quotation', 'Open Tender', 'Selective Tender', 'Direct Contracting', 'Single / National Provider', 'Emergency Procurement'].map(function (x) { return [x, x]; }) });
          h += P.fieldHTML('Date RFQ / invitation issued', 'docState.rfqdate', { type: 'date' });
          h += P.fieldHTML('Closing date', 'docState.deadline', { type: 'date' });
          h += P.fieldHTML('If Direct / Single Provider / Emergency — why?', 'docState.methodjust', { type: 'textarea', wide: true });
          h += P.fieldHTML('If the recommended supplier is not the lowest — why?', 'docState.notlowest', { type: 'textarea', wide: true });
          h += '</div>';
          h += P.routineWorkHTML(cf);
          return h;
        }
      },
      {
        id: 'money',
        title: 'What money pays for it?',
        hint: 'Type the five figures from the vote book; the three balances are worked out for you.',
        checks: [/^C1[2456]/, /^H/],
        done: function (cf) { return !!(cf.voteStatus || has(cf, 'docState.funds')); },
        render: function (cf) { return root().PANELS.voteHTML(cf); }
      },
      {
        id: 'folios',
        title: 'Which papers are in the file?',
        hint: 'List the papers in order — every folio number in every document is worked out from this list.',
        checks: [/^C2[01]/, /^G5/],
        done: function (cf) {
          return (cf.docState.folios || []).some(function (f) { return f && f.desc && String(f.desc).trim(); });
        },
        render: function (cf) { return root().PANELS.folHTML(cf); }
      },
      signStep(),
      docsStep()
    ];
  }

  /* -- formal journey -- */
  function formalSteps() {
    return [
      {
        id: 'about',
        title: 'What is being evaluated?',
        hint: 'The solicitation as advertised — its title, number and story so far.',
        checks: [/^G[1236]/],
        done: function (cf) { return has(cf, 'docState.minfile') && has(cf, 'docState.date') && (has(cf, 'docState.subject') || has(cf, 'formal.rfpTitle')); },
        render: function (cf) {
          var P = root().PANELS;
          var h = '<div class="grid">';
          h += P.fieldHTML('File number', 'docState.minfile', { req: true });
          h += P.fieldHTML('Date', 'docState.date', { type: 'date', req: true });
          h += P.fieldHTML('Subject / title', 'docState.subject', { wide: true, req: true });
          h += '</div>';
          h += P.formalSections(cf).solicitation;
          h += composerDetails(cf);
          h += moreOptionsHTML(cf);
          return h;
        }
      },
      papersStep(),
      {
        id: 'committee',
        title: 'Who is on the committee?',
        hint: 'Typically three to six people. Every member signs the conflict-of-interest and confidentiality declaration before evaluating.',
        checks: [/^F1$/],
        done: function (cf) {
          var named = ((cf.formal || {}).committee || []).filter(function (m) { return (m.name || '').trim(); });
          return named.length >= 3 && named.every(function (m) { return m.coiSigned; });
        },
        render: function (cf) { return root().PANELS.formalSections(cf).committee; }
      },
      {
        id: 'rules',
        title: 'What are the rules of the evaluation?',
        hint: 'Straight from the solicitation: the criteria and their points, the minimum technical score, and the technical/financial weights (they must total 100).',
        checks: [/^F[238]/],
        done: function (cf) {
          var f = cf.formal || {};
          return (f.criteria || []).length > 0 && String(f.minTechnicalScore).trim() !== '' &&
            Number(f.technicalWeight) + Number(f.financialWeight) === 100;
        },
        render: function (cf) { return root().PANELS.formalSections(cf).criteria; }
      },
      {
        id: 'proponents',
        title: 'Who submitted, and did they comply?',
        hint: 'List every firm, then mark each compliant or not at the preliminary examination — a rejection needs its reason.',
        checks: [/^F[45]/],
        done: function (cf) {
          var ps = ((cf.formal || {}).proponents || []).filter(function (p) { return (p.name || '').trim(); });
          return ps.length > 0 && ps.every(function (p) { return p.compliant === 'yes' || (p.compliant === 'no' && (p.complianceNote || '').trim()); });
        },
        render: function (cf) { return root().PANELS.formalSections(cf).proponents; }
      },
      {
        id: 'scores',
        title: 'Score and price the proposals',
        hint: 'Score each compliant firm on each criterion; the gate and totals are computed. Gate-passers get their verified price (VAT inclusive).',
        checks: [/^F[67]/],
        done: function (cf) { return Object.keys(((cf.formal || {}).techScores) || {}).length > 0; },
        render: function (cf) {
          var S = root().PANELS.formalSections(cf);
          return S.scores + S.clarifications;
        }
      },
      {
        id: 'decision',
        title: 'The ranking and the recommendation',
        hint: 'The ranking is computed from your scores and weights. Recommend the top-ranked firm, or another with written reasons.',
        checks: [/^F(9|10)/],
        done: function (cf) {
          var f = cf.formal || {};
          return f.recommendedProponent != null;
        },
        render: function (cf) { return root().PANELS.formalSections(cf).decision; }
      },
      signStep(),
      docsStep()
    ];
  }

  /* -- disposal journey -- */
  function disposalSteps() {
    return [
      {
        id: 'about',
        title: 'What is being disposed of, and why?',
        hint: 'The request as it will appear on Form A.',
        checks: [/^G[1236]/],
        done: function (cf) { return has(cf, 'docState.subject') && has(cf, 'docState.minfile') && has(cf, 'docState.date'); },
        render: function (cf) {
          var P = root().PANELS;
          var h = '<div class="grid">';
          h += P.fieldHTML('Subject / title', 'docState.subject', { wide: true, req: true, placeholder: 'e.g. Used Office Furniture and Equipment' });
          h += P.fieldHTML('File number', 'docState.minfile', { req: true });
          h += P.fieldHTML('Date', 'docState.date', { type: 'date', req: true });
          h += '</div>';
          h += P.disposalSections(cf).request;
          h += composerDetails(cf);
          h += moreOptionsHTML(cf);
          return h;
        }
      },
      papersStep(),
      {
        id: 'people',
        title: 'Who is handling it?',
        hint: 'The officers, the Disposal Committee (the Act requires at least three), and the PDAC that reviews the file.',
        checks: [/^D1$/],
        done: function (cf) {
          var named = (((cf.disposal || {}).committee) || []).filter(function (m) { return (m.name || '').trim(); });
          return named.length >= 3;
        },
        render: function (cf) { return root().PANELS.disposalSections(cf).people; }
      },
      {
        id: 'property',
        title: 'What exactly is the property?',
        hint: 'One card per item. Enter the Total NBV where one exists — the unit NBV, 20% and appraised value are worked out; the sale price is the committee’s decision.',
        checks: [/^D(2|3|4|5|6)/],
        done: function (cf) { return (((cf.disposal || {}).items) || []).length > 0; },
        render: function (cf) { return root().PANELS.disposalSections(cf).property; }
      },
      {
        id: 'strategy',
        title: 'What is the disposal strategy?',
        hint: 'Form D — fill only what applies to this disposal.',
        checks: [/^D7/],
        done: function () { return true; },
        optional: true,
        render: function (cf) { return root().PANELS.disposalSections(cf).strategy; }
      },
      {
        id: 'approvals',
        title: 'Approvals and the statutory clock',
        hint: 'The dates as they happen. The system watches the fourteen-day decision and the six-week OPR notification for you.',
        checks: [/^D(8|9)/],
        done: function () { return true; },
        optional: true,
        render: function (cf) { return root().PANELS.disposalSections(cf).approvals; }
      },
      {
        id: 'after',
        title: 'After the disposal',
        hint: 'Only if they apply: the summary of the completed disposal (Form F), a transfer or donation (Form G), or a rejection notice (Form H).',
        checks: [/^D1[012]/],
        done: function () { return true; },
        optional: true,
        render: function (cf) { return root().PANELS.disposalSections(cf).after; }
      },
      signStep(),
      docsStep()
    ];
  }

  var JOURNEYS = {
    'routine': routineSteps,
    'formal-evaluation': formalSteps,
    'disposal': disposalSteps
  };

  function steps(moduleId) {
    var f = JOURNEYS[moduleId];
    return f ? f() : [];
  }

  /* Which step fixes a given verification check id. */
  function stepForCheck(moduleId, checkId) {
    var list = steps(moduleId);
    for (var i = 0; i < list.length; i++) {
      var cs = list[i].checks || [];
      for (var j = 0; j < cs.length; j++) if (cs[j].test(checkId)) return list[i].id;
    }
    return 'sign';
  }
  function stepIndex(moduleId, stepId) {
    var list = steps(moduleId);
    for (var i = 0; i < list.length; i++) if (list[i].id === stepId) return i;
    return 0;
  }

  /* ---------------- browser-only rendering ----------------------------- */
  function root() { return (typeof window !== 'undefined') ? window : {}; }

  var DEFAULT_DOC = { 'routine': 'minute', 'formal-evaluation': 'formal-report', 'disposal': 'disposal-form-a' };

  function previewDocId(cf) {
    var docs = M.documents.availableDocs(cf).map(function (d) { return d.id; });
    var want = root().APP.guideDoc;
    if (want && docs.indexOf(want) >= 0) return want;
    if (docs.indexOf(DEFAULT_DOC[cf.module]) >= 0) return DEFAULT_DOC[cf.module];
    return docs[0] || null;
  }

  function previewHTML(cf) {
    var id = previewDocId(cf);
    if (!id) return '<p class="hint">No document is available yet.</p>';
    try { return M.documents.build(cf, id); }
    catch (e) { return '<p class="hint">[The preview will appear as soon as there is enough to build it: ' + esc(e.message) + ']</p>'; }
  }

  /* Plain-language outstanding-issues list for the sign step. */
  function issuesHTML(cf) {
    var R = M.verifycase.runAllChecks(cf);
    var fails = R.filter(function (r) { return r.result === 'FAIL'; });
    var warns = R.filter(function (r) { return r.result === 'WARN'; });
    var h = '';
    function li(r) {
      return '<li><b>' + esc(r.name) + '.</b> ' + (r.action ? esc(r.action) + ' ' : '') +
        '<button class="btn sec small" data-action="guide-fix" data-check="' + esc(r.id) + '">Go</button></li>';
    }
    if (!fails.length) {
      h += '<div class="notice green" style="margin-top:12px"><b>Everything checks out.</b> The documents will print clean — no DRAFT stamp.</div>';
    } else {
      h += '<div class="notice red" style="margin-top:12px"><b>' + fails.length + ' thing' + (fails.length === 1 ? '' : 's') + ' still need' + (fails.length === 1 ? 's' : '') + ' attention before signature:</b><ul style="margin:6px 0">' + fails.map(li).join('') + '</ul></div>';
    }
    if (warns.length) {
      h += '<div class="notice" style="margin-top:8px"><b>Worth a look (not blocking):</b><ul style="margin:6px 0">' + warns.map(li).join('') + '</ul></div>';
    }
    return h;
  }

  /* The documents-first drop-zone step. */
  function papersHTML(cf) {
    var APP = root().APP;
    var h = '<div class="dropzone" data-action="guide-pick"><div class="dzicon">📄</div><div><b>Drop a document here, or click to choose</b><div class="hint">Word, Excel, CSV or text-PDF. The system reads it; nothing enters the case until you tick it below.</div></div></div>';
    h += '<input type="file" id="guideFile" style="display:none" accept=".pdf,.docx,.xlsx,.xls,.csv,.txt">';
    if (APP.ingestWarning) h += '<div class="notice" style="margin-top:10px">' + esc(APP.ingestWarning) + '</div>';
    var cands = APP.ingestCandidates || [];
    if (cands.length) {
      var a = APP.intakeAnalysis || {};
      var ready = cands.filter(function (c) { return c.accepted && !c.applied && !c.rejected; }).length;
      h += '<fieldset class="box" style="margin-top:12px"><legend>Found in “' + esc(a.fileName || 'your document') + '” — tick what to use</legend>';
      h += '<ul class="gcands">';
      cands.forEach(function (c, i) {
        var IU = root().INGEST_UI;
        var opts = [];
        try { opts = IU ? [[c.target || IU.defaultTargetFor(c), '']] : []; } catch (e) { }
        var valueText = c.kind === 'item-line'
          ? esc(c.value.desc) + ' — qty ' + esc(String(c.value.qty == null ? c.value.qtyRaw : c.value.qty)) + (c.value.unit ? ' × ' + esc(c.value.unit) : '')
          : esc(typeof c.value === 'string' ? c.value : JSON.stringify(c.value));
        var malformed = c.kind === 'figure' && !M.ingest.canAccept(c);
        var cls = c.applied ? 'applied' : malformed ? 'bad' : '';
        h += '<li class="' + cls + '">';
        if (c.applied) {
          h += '<span class="gdone">✓</span> ' + valueText + ' <span class="hint">added</span>';
        } else if (malformed) {
          h += '<span class="gbad">✕</span> ' + valueText + ' <span class="hint">— this amount cannot be right as printed; </span><button class="btn sec small" data-action="cand-edit" data-i="' + i + '">Correct it</button>';
        } else {
          h += '<label><input type="checkbox" data-gcand="' + i + '"' + (c.accepted ? ' checked' : '') + '> ' + valueText + '</label> <span class="hint">' + esc(c.kind) + (c.snippet ? ' · “' + esc(String(c.snippet).slice(0, 60)) + '”' : '') + '</span>';
        }
        h += '</li>';
      });
      h += '</ul>';
      h += '<p class="hint">Amounts must be ticked one by one — that is deliberate: every figure is a human decision.</p>';
      h += '<button class="btn" data-action="intake-apply-facts"' + (ready ? '' : ' disabled') + '>Add ticked items to my case</button>';
      h += '</fieldset>';
    }
    h += '<p class="hint" style="margin-top:10px">Need the full upload options (layout guidance, choosing exactly where each fact goes)? <button class="btn sec small" data-action="open-intake-modal">Open the full upload window</button></p>';
    return h;
  }

  /* The final documents step. */
  function docsHTML(cf) {
    var docs = M.documents.availableDocs(cf);
    var stats = M.verifycase.stats(cf);
    var h = '';
    if (stats.fail) {
      h += '<div class="notice red">The documents will carry the <b>DRAFT — NOT CLEARED</b> stamp until the items on the “Check and sign” step are resolved.</div>';
    } else {
      h += '<div class="notice green"><b>All checks passed.</b> The documents below print clean.</div>';
    }
    h += '<div class="gdocs">';
    docs.forEach(function (d) {
      h += '<div class="gdoc"><b>' + esc(d.label) + '</b><span class="gdocbtns">' +
        '<button class="btn sec small" data-action="guide-preview-doc" data-doc="' + esc(d.id) + '">Preview</button> ' +
        '<button class="btn small" data-action="guide-download" data-doc="' + esc(d.id) + '">Download (.doc)</button></span></div>';
    });
    h += '</div>';
    h += '<div style="margin-top:12px"><button class="btn" data-action="guide-download-all">Download all documents</button> <button class="btn sec" data-action="doc-print">Print the previewed document</button></div>';
    h += '<p class="hint" style="margin-top:10px">Then use <b>Save Case (.json)</b> in the bottom bar — that file is the record of everything you entered.</p>';
    return h;
  }

  /* The full guided shell. */
  function render(panel) {
    var APP = root().APP;
    var cf = APP.caseFile;
    if (!cf) { panel.innerHTML = ''; return; }
    var list = steps(cf.module);
    if (!list.length) { panel.innerHTML = '<p>This activity has no guided journey; use the full form view.</p>'; return; }
    var i = Math.max(0, Math.min(APP.guideStep || 0, list.length - 1));
    APP.guideStep = i;
    var st = list[i];

    var h = '<div class="gshell">';
    /* rail */
    h += '<aside class="grail"><div class="gcase"><b>' + esc(cf.docState.subject || 'New case') + '</b><div class="hint">' + esc(M.casemodel.MODULES[cf.module] || cf.module) + '</div></div><ol class="gsteps">';
    list.forEach(function (s, idx) {
      var isDone = false;
      try { isDone = !!s.done(cf); } catch (e) { }
      var cls = idx === i ? 'cur' : (isDone && !s.optional ? 'ok' : '');
      var dot = (idx !== i && isDone && !s.optional) ? '✓' : String(idx + 1);
      h += '<li class="' + cls + '"><button data-action="guide-goto" data-i="' + idx + '"><span class="gdot">' + dot + '</span>' + esc(s.title) + '</button></li>';
    });
    h += '</ol>';
    h += '<div class="grail-foot"><button class="btn sec small" data-action="guide-expert" title="The complete tabbed form, for experienced users">Full form view</button> ' +
      '<button class="btn sec small" data-action="guide-start">Start screen</button></div>';
    h += '</aside>';

    /* step + preview */
    h += '<div class="gmain"><div class="gstep"><div class="gq"><span class="gnum">Step ' + (i + 1) + ' of ' + list.length + (st.optional ? ' · optional' : '') + '</span><h2>' + esc(st.title) + '</h2>' + (st.hint ? '<p class="hint">' + esc(st.hint) + '</p>' : '') + '</div>';
    h += '<div class="gbody">' + st.render(cf) + '</div>';
    h += '<div class="gnav">' + (i > 0 ? '<button class="btn sec" data-action="guide-back">‹ Back</button> ' : '') +
      (i < list.length - 1 ? '<button class="btn" data-action="guide-next">' + (st.optional ? 'Skip / next ›' : 'Next ›') + '</button>' : '') + '</div></div>';

    var docsAvail = M.documents.availableDocs(cf);
    h += '<div class="gpreview" id="preview"><div class="gprevhead">Live preview — this is the actual document&nbsp; <select data-special="guide-doc">' +
      docsAvail.map(function (d) { return '<option value="' + esc(d.id) + '"' + (d.id === previewDocId(cf) ? ' selected' : '') + '>' + esc(d.label) + '</option>'; }).join('') +
      '</select></div><div class="gprevbody"><div class="sheet"><div class="doc">' + previewHTML(cf) + '</div></div></div></div>';
    h += '</div></div>';

    panel.innerHTML = h;
    var P = root().PANELS;
    P.bindInputs(panel);
    P.lightUpdate(panel);
    bindDropzone(panel);
  }

  function bindDropzone(panel) {
    var dz = panel.querySelector('.dropzone');
    if (!dz) return;
    ['dragover', 'dragenter'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('over'); });
    });
    dz.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f && root().MAIN) root().MAIN.handleIngestFile(f);
    });
  }

  /* live preview refresh while typing (browser only) */
  var previewTimer = null;
  function schedulePreview() {
    if (typeof document === 'undefined') return;
    clearTimeout(previewTimer);
    previewTimer = setTimeout(function () {
      var APP = root().APP;
      if (!APP || APP.currentTab !== 'guide' || !APP.caseFile) return;
      var host = document.querySelector('#tab-guide .gprevbody .doc');
      if (host) host.innerHTML = previewHTML(APP.caseFile);
      /* the step rail's done-marks may also have changed */
    }, 650);
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('input', function () {
      var APP = root().APP;
      if (APP && APP.currentTab === 'guide') schedulePreview();
    });
  }

  return {
    steps: steps,
    stepForCheck: stepForCheck,
    stepIndex: stepIndex,
    render: render,
    schedulePreview: schedulePreview
  };
});

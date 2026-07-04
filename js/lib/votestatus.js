/* votestatus.js — the "status of the vote" table that closes the funding
   paragraph of a Ministry minute. Five figures are typed from the vote
   book; the three balances are computed, never typed:
     Balance of Releases  = Releases to Date − Expenditure to Date − Commitment
     Balance of Provision = (provision base) − Expenditure to Date
     Uncommitted Balance  = Balance of Provision − Commitment
   Both signed samples obey these relationships exactly (boxed meals:
   7,386.99 / 376,439.43 / 354,784.99; materials: 6,987.66 / 66,250.00 /
   7,274.66).

   Provision base — verified treatment. The Ministry of Finance
   (Comptroller of Accounts) Accounting Manual, Vote Book section 2.3.3
   (authority: Financial Regulations paras 66–69 to the Exchequer and
   Audit Act Ch. 69:01), states the Vote Book ensures expenditure "does
   not exceed the funds allocated for the current financial year and the
   releases granted to date", and the Schedule of Accounts records
   "amounts added and deducted from the original provision (transfers,
   virements) to date" (Financial Instructions 1965, para 103(2)). Vote
   control is therefore against the allocation AS VARIED by approved
   transfers and virements — the Revised Allocation — and that is the
   default base here. The manual does not use the literal words "Balance
   of Provision", so a per-case override (voteStatus.provisionBase =
   'original') exists for the event that a written instruction directs
   the Original Provision; the interface offers it only when the two
   figures actually differ, and every certificate records the base used.

   A shortfall against the case total is reported and the "Director of
   Finance to address the necessary transfer" line is included
   automatically — computed, never remembered.
   Loads in the browser as MODPA.votestatus and in Node via require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./money.js'), require('./textutil.js'));
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.votestatus = factory(root.MODPA.money, root.MODPA.textutil);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (money, textutil) {
  'use strict';

  var esc = textutil.esc, fmtMoney = money.fmtMoney;

  var INPUT_FIELDS = [
    ['originalProvision', 'Original Provision'],
    ['revisedAllocation', 'Revised Allocation'],
    ['releasesToDate', 'Releases To Date'],
    ['expenditureToDate', 'Expenditure to date'],
    ['commitment', 'Commitment']
  ];

  /* voteStatus (five typed figures, strings; optional provisionBase
     'revised' | 'original') -> computed cents + errors + notes. */
  function compute(vs) {
    var out = { ok: true, errors: [], notes: [], cents: {}, baseUsed: 'revised' };
    if (!vs || typeof vs !== 'object') return { ok: false, errors: ['No vote status entered.'], notes: [], cents: {}, baseUsed: 'revised' };
    for (var i = 0; i < INPUT_FIELDS.length; i++) {
      var k = INPUT_FIELDS[i][0], label = INPUT_FIELDS[i][1];
      var p = money.parseStrict(vs[k]);
      if (!p.ok) { out.ok = false; out.errors.push(label + ': ' + p.hint); continue; }
      out.cents[k] = p.cents;
    }
    if (!out.ok) return out;
    var c = out.cents;
    out.baseUsed = vs.provisionBase === 'original' ? 'original' : 'revised';
    var base = out.baseUsed === 'original' ? c.originalProvision : c.revisedAllocation;
    c.balanceOfReleases = c.releasesToDate - c.expenditureToDate - c.commitment;
    c.balanceOfProvision = base - c.expenditureToDate;
    c.uncommittedBalance = c.balanceOfProvision - c.commitment;
    if (c.originalProvision !== c.revisedAllocation) {
      out.notes.push('Original Provision and Revised Allocation differ. Balance of Provision is measured against the ' +
        (out.baseUsed === 'original' ? 'Original Provision (per-case selection recorded on this case)' :
          'Revised Allocation (Ministry of Finance vote-book practice: control is against the allocation as varied by approved transfers and virements — Comptroller of Accounts Accounting Manual §2.3.3; Financial Instructions 1965 para 103(2))') + '.');
    }
    if (c.balanceOfReleases < 0) out.errors.push('Balance of Releases is negative (' + fmtMoney(c.balanceOfReleases) + ') — expenditure plus commitment exceeds releases. Confirm the figures against the vote book.');
    if (c.uncommittedBalance < 0) out.errors.push('Uncommitted Balance is negative (' + fmtMoney(c.uncommittedBalance) + '). Confirm the figures against the vote book.');
    return out;
  }

  /* Shortfall of the uncommitted balance against a case total, or 0. */
  function shortfallCents(vs, totalCents) {
    var c = compute(vs);
    if (!c.ok || !Number.isFinite(totalCents)) return 0;
    var diff = totalCents - c.cents.uncommittedBalance;
    return diff > 0 ? diff : 0;
  }

  /* The eight-column table exactly as the samples set it out. */
  function tableHTML(vs, columns) {
    var c = compute(vs);
    var cols = columns || ['Original Provision', 'Revised Allocation', 'Releases\nTo Date', 'Expenditure\nto date', 'Commitment', 'Balance of Releases', 'Balance of\nProvision', 'Uncommitted Balance'];
    var h = '<table class="cmp"><tr>';
    for (var i = 0; i < cols.length; i++) h += '<th>' + esc(cols[i]).replace(/\n/g, '<br>') + '</th>';
    h += '</tr><tr>';
    if (!c.ok) {
      h += '<td colspan="' + cols.length + '" style="text-align:center"><b>VOTE FIGURES INCOMPLETE — ' + esc(c.errors.join(' ')) + '</b></td>';
    } else {
      var order = ['originalProvision', 'revisedAllocation', 'releasesToDate', 'expenditureToDate', 'commitment', 'balanceOfReleases', 'balanceOfProvision', 'uncommittedBalance'];
      for (var j = 0; j < order.length; j++) h += '<td class="num">' + fmtMoney(c.cents[order[j]]) + '</td>';
    }
    h += '</tr></table>';
    return h;
  }

  /* The H-series verification checks. totalCents may be NaN/undefined when
     the case total itself is not computable (reported elsewhere). */
  function runVoteChecks(vs, totalCents) {
    var R = [];
    function add(id, name, result, detail, action) {
      R.push({ id: id, name: name, result: result, detail: detail || '', action: action || '' });
    }
    if (!vs) {
      add('H1', 'Vote status', 'INFO', 'No vote status entered — the minute will not print the vote status table.', 'Enter the five vote-book figures to include it.');
      return R;
    }
    var c = compute(vs);
    if (!c.ok) {
      add('H1', 'Vote status figures valid', 'FAIL', c.errors.join(' '), 'Correct the five typed figures; the three balances are computed.');
      return R;
    }
    add('H1', 'Vote status figures valid', 'PASS', 'Balances computed: Balance of Releases ' + fmtMoney(c.cents.balanceOfReleases) + '; Balance of Provision ' + fmtMoney(c.cents.balanceOfProvision) + '; Uncommitted Balance ' + fmtMoney(c.cents.uncommittedBalance) + '.' + (c.notes.length ? ' ' + c.notes.join(' ') : ''), '');
    if (c.errors.length) add('H1a', 'Vote balances plausible', 'WARN', c.errors.join(' '), 'Confirm the figures against the vote book.');
    if (Number.isFinite(totalCents) && totalCents > 0) {
      var short = totalCents - c.cents.uncommittedBalance;
      if (short > 0) {
        add('H2', 'Uncommitted balance covers the total', 'WARN',
          'Total ' + fmtMoney(totalCents) + ' exceeds the uncommitted balance ' + fmtMoney(c.cents.uncommittedBalance) + ' by ' + fmtMoney(short) + '. The transfer-of-funds line is included in the minute automatically.',
          'Confirm the Director of Finance will address the transfer.');
      } else {
        add('H2', 'Uncommitted balance covers the total', 'PASS', 'Uncommitted balance ' + fmtMoney(c.cents.uncommittedBalance) + ' against a total of ' + fmtMoney(totalCents) + '.', '');
      }
    }
    return R;
  }

  return {
    INPUT_FIELDS: INPUT_FIELDS,
    compute: compute,
    shortfallCents: shortfallCents,
    tableHTML: tableHTML,
    runVoteChecks: runVoteChecks
  };
});

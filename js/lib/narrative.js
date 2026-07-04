/* narrative.js — the deterministic offline narrative composer. It stitches
   the facts the user supplies into a first draft in the house register; it
   uses only the words supplied, invents nothing, and returns '' when there
   is nothing usable. Ported from Approvals_Composer.html.
   Loads in the browser as MODPA.narrative and in Node via require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./textutil.js'));
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.narrative = factory(root.MODPA.textutil);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (textutil) {
  'use strict';

  var endStop = textutil.endStop, softLower = textutil.softLower,
    cleanNoteLine = textutil.cleanNoteLine, notesToSentences = textutil.notesToSentences;

  /* target: 'need' | 'methodjust' | 'minextra'
     f: {activity, who, when, cons, notes}
     ctx: {subject, method, itemsLine} */
  function composeOffline(target, f, ctx) {
    f = f || {}; ctx = ctx || {};
    var activity = (f.activity || '').trim(), who = (f.who || '').trim(),
      when = (f.when || '').trim(), cons = (f.cons || '').trim(),
      notes = (f.notes || '').trim();
    if (target === 'minextra') {
      if (!notes) return '';
      return notes.split(/\n\s*\n/).map(function (p) {
        var sents = p.split(/\n/).map(cleanNoteLine).filter(function (x) { return x; });
        return sents.join(' ');
      }).filter(function (x) { return x; }).join('\n\n');
    }
    if (target === 'need') {
      if (!activity && !cons && !notes) return '';
      var parts = [];
      if (activity) {
        var s = 'The items listed in this approval are required to facilitate ' + softLower(activity);
        if (who) s += ' for ' + softLower(who);
        if (when) s += ', carded for ' + when;
        parts.push(endStop(s));
      } else if (who) {
        parts.push(endStop('The items listed in this approval are required for ' + softLower(who) + (when ? ', carded for ' + when : '')));
      }
      var nl = notesToSentences(notes);
      for (var i = 0; i < nl.length; i++) parts.push(nl[i]);
      if (cons) parts.push(endStop('Should the items not be procured, ' + softLower(cons)));
      return parts.join(' ');
    }
    if (target === 'methodjust') {
      if (!ctx.method && !notes && !activity) return '';
      var out = [];
      if (ctx.method) out.push('The procurement was conducted by way of ' + ctx.method + '.');
      var nl2 = notesToSentences(notes);
      if (nl2.length) {
        var first = nl2[0];
        if (!/^(this method\b|owing to\b|given\b|because\b|due to\b|as [a-z])/i.test(first)) first = 'This method was adopted because ' + softLower(first);
        out.push(first);
        for (var j = 1; j < nl2.length; j++) out.push(nl2[j]);
      } else if (activity) {
        out.push(endStop('This method was adopted to meet the requirement for ' + softLower(activity) + (when ? ', carded for ' + when : '')));
      }
      if (cons) out.push(endStop('Should the requirement not be met, ' + softLower(cons)));
      return out.length > 1 ? out.join(' ') : '';
    }
    return '';
  }

  return { composeOffline: composeOffline };
});

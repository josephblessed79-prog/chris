/* sampledata.js — the two signed sample evaluations, transcribed cell by
   cell from samples/source/. These are the inputs for the replay dry runs.
   Where the signed sheet itself contains a figure error, the transcription
   records what the quotation cell actually says (unit price, flags,
   quantities); the dry runs assert the CORRECT computed arithmetic and
   separately demonstrate that the system flags the malformed printed
   figures on entry. */
'use strict';

const evaluation = require('../../js/lib/evaluation.js');

/* ---------------- Pantry supplies (Evaluation of Pantry Supplies-GA) ----
   Two quoting suppliers; five suppliers did not quote.
   Cell notation: [unitDollars, vatable, quotedQty, packSize, compliant] */
function pantryEvaluation() {
  const ev = evaluation.newEvaluation();
  ev.suppliers = [
    { name: 'Beyond Office Solutions Limited', address: '', status: 'quoted' },
    { name: 'Ramsackal’s Central Supermarket Limited', address: '', status: 'quoted' },
    { name: 'Massy Stores Limited', address: '', status: 'did-not-quote' },
    { name: 'A. S. Brydens & Sons (Trinidad) Limited', address: '', status: 'did-not-quote' },
    { name: 'Micon Marketing Limited', address: '', status: 'did-not-quote' },
    { name: 'The Food Hall Limited', address: '', status: 'did-not-quote' },
    { name: 'Pigalle’s Limited', address: '', status: 'did-not-quote' }
  ];
  const rows = [
    // desc, variant, qty, unitName, Beyond, Ramsackal
    ['Brown Sugar', '1800g', 100, 'Packs', ['25.50', 0, null, null, 1], ['20.50', 0, null, null, 1]],
    ['White Sugar', '1800g', 100, 'Packs', ['24.70', 1, 96, null, 1], ['19.75', 1, null, null, 1]],
    ['English Breakfast Tea', 'Twinning’s', 20, 'Boxes', ['39.95', 1, null, null, 1], ['38.00', 0, null, null, 1]],
    ['Ensure', 'Chocolate 237ml', 108, 'Bottles', ['19.25', 1, null, null, 1], ['20.00', 1, null, null, 1]],
    ['Ensure', 'Vanilla 237ml', 108, 'Bottles', ['19.25', 1, null, null, 1], ['20.00', 1, null, null, 1]],
    ['Milo', '400g', 100, 'Packs', ['45.55', 0, null, null, 1], ['42.00', 1, null, null, 1]],
    ['Lucozade', 'Orange 360ml', 60, 'Bottles', ['320.00', 1, null, 24, 1], ['12.80', 1, null, null, 1]],
    ['Lucozade', 'Tropical 360ml', 60, 'Bottles', ['320.00', 1, null, 24, 1], ['12.80', 1, null, null, 1]],
    /* Condensed Milk: the signed sheet prices 5 cases = 240 at $826.15 —
       arithmetically a case of 48 even though the note says "(24/case)";
       the printed extended figure $4,130.75 = 5 × $826.15. */
    ['Condensed Milk', '395g', 240, 'Tins', ['826.15', 0, null, 48, 1], ['16.00', 0, null, null, 1]],
    ['Evaporated Milk', 'Green Butterfly Evaporated Milk 250ml', 240, 'Packs', ['212.25', 0, null, 24, 1], ['8.00', 0, null, null, 1]],
    ['Mauby', '750 ml', 60, 'Bottles', ['242.00', 0, null, 12, 1], ['16.00', 1, null, null, 1]],
    ['Trinidad Juices', 'Orange 540ml', 200, 'Tins', ['190.00', 0, null, 12, 1], ['15.50', 0, null, null, 1]],
    ['Trinidad Juices', 'Grapefruit 540ml', 200, 'Tins', ['172.00', 1, null, 12, 1], ['13.78', 1, null, null, 1]],
    ['Trinidad Juices', 'Pineapple 540ml', 200, 'Tins', ['172.00', 0, null, 12, 1], ['13.78', 1, null, null, 1]],
    ['Wheat Crisp', 'Original 32g', 10, 'Packs of 9 Each', ['25.75', 0, null, null, 1], ['25.00', 0, null, null, 1]],
    ['Wheat Crisp', 'Garden Herb 32g', 10, 'Packs of 9 Each', ['25.75', 0, null, null, 1], ['25.00', 0, null, null, 1]],
    ['Ovaltine Biscuit', '150g', 50, 'Packs of 4', ['19.95', 0, 48, null, 1], ['20.00', 0, null, null, 1]],
    ['Cashew Nuts', 'Lightly salted 34g (Sunshine)', 100, 'Packs', ['11.50', 1, 96, null, 1], ['5.60', 1, null, null, 1]],
    ['Peanuts', 'Salted Peanuts 30g (Sunshine)', 100, 'Packs', ['5.00', 1, 96, null, 1], ['2.75', 1, null, null, 1]],
    ['Sun Mix', 'Salty Sweet 57g', 100, 'Packs', ['11.50', 1, 96, null, 1], ['8.00', 1, null, null, 1]],
    ['Sun Mix', 'Fruit Fest 57g', 100, 'Packs', ['11.50', 1, 96, null, 1], ['8.90', 1, null, null, 1]],
    ['Exotica Nuts', 'Fruit and Nut fusion 60g', 100, 'Packs', ['9.95', 1, 96, null, 1], ['8.90', 1, null, null, 1]],
    ['Exotica Nuts', 'Premium Mix 49g', 100, 'Packs', ['9.95', 1, 96, null, 1], ['8.90', 1, null, null, 1]],
    ['Digestive Biscuits', '41g', 96, 'Packs', ['2.50', 0, null, null, 1], ['2.50', 0, null, null, 1]],
    ['Dixee Crackers', 'Cheese 49g', 96, 'Packs', ['5.60', 0, null, null, 1], ['5.00', 0, null, null, 1]],
    ['Dixee Crackers', 'Peanut Butter 49g', 96, 'Packs', ['5.60', 0, null, null, 1], ['5.00', 0, null, null, 1]],
    ['Dixee Crackers', 'Guava 49g', 96, 'Packs', ['5.60', 0, null, null, 1], ['5.00', 0, null, null, 1]],
    ['Crix Snack Crackers', 'Cheese 50g', 60, 'Packs', ['5.60', 0, null, null, 1], ['5.00', 0, null, null, 1]],
    ['Crix Snack Crackers', 'Cheese and Spinach 50g', 60, 'Packs', ['5.60', 0, null, null, 1], ['5.00', 0, null, null, 1]],
    ['Plantain Chips', 'Lightly Salted 42g', 120, 'Packs', ['6.00', 1, null, null, 1], ['5.50', 1, null, null, 1]],
    /* Granola bars: Beyond quoted boxes of 6 against a requirement of
       boxes of 12 — recorded non-compliant, so the automatic
       recommendation goes to Ramsackal, as the committee decided. */
    ['Granola Bars', 'Nature Valley Variety Pack 42g', 25, 'Boxes of 12', ['50.95', 1, 25, null, 0], ['84.00', 1, null, null, 1]],
    ['Tea Time Biscuits', 'Chocolate 40g', 200, 'Packs', ['3.00', 0, null, null, 1], ['2.50', 0, null, null, 1]],
    ['Tea Time Biscuits', 'Vanilla 40g', 200, 'Packs', ['3.00', 0, null, null, 1], ['2.50', 0, null, null, 1]]
  ];
  rows.forEach(function (r, i) {
    ev.items.push({ desc: r[0], variant: r[1], qty: r[2], unitName: r[3] });
    const mk = (supIdx, c) => {
      if (!c) return;
      ev.cells.push({
        item: i, supplier: supIdx, unit: c[0], vatable: !!c[1],
        quotedQty: c[2], packSize: c[3], note: '',
        compliant: !!c[4],
        complianceNote: c[4] ? '' : 'Quoted boxes of 6 against a requirement of boxes of 12.'
      });
    };
    mk(0, r[4]); mk(1, r[5]);
  });
  /* Digestive Biscuits (item index 23) tie at $2.50: the committee selected
     Beyond Office Solutions, recorded with the basis for the tie pick. */
  ev.selections.push({ item: 23, supplier: 0, justification: '', tieNote: 'Tied lowest price; grouped with the Ensure award to Beyond Office Solutions for a single delivery.' });
  return ev;
}

/* -------- Minor equipment (Evaluation re Minor Equipment) --------
   Four quoting suppliers. The signed sheet contains figure errors the dry
   run must NOT reproduce: Pillai item 1 extended printed $59,405.44
   (correct: 8 × $7,425.00 = $59,400.00), J. Chai item 7 printed
   "$11,3900.00" (correct: 2 × $5,695.00 = $11,390.00), Pillai V subtotal
   printed "$57,4716.72", Pillai VAT printed $60,106.32, J. Chai total left
   blank, Trintrac total printed without VAT. */
function minorEquipmentEvaluation() {
  const ev = evaluation.newEvaluation();
  ev.suppliers = [
    { name: 'FT Farfan Ltd', address: '', status: 'quoted' },
    { name: 'Pillai Tools Co. Ltd', address: '', status: 'quoted' },
    { name: 'J. Chai Trading Co. Ltd', address: '', status: 'quoted' },
    { name: 'Trintrac Limited', address: '', status: 'quoted' }
  ];
  const rows = [
    ['Brush cutter', 'High power/high torque, 2-Mix, Auto Cut 46-2', 8, 'Each',
      ['6,222.50', 0, null], ['7,425.00', 1, null], ['6,600.00', 0, null], ['5,250.00', 0, null]],
    ['Lower Back Pack Blower', 'Low noise, gasoline, 4-Mix, 1.4L', 4, 'Each',
      ['4,322.50', 1, null], ['4860.68', 1, null], ['4,550.00', 1, null], ['5,088.89', 1, null]],
    ['Pressure Washer', 'Gasoline, 50ft hose, 4,200psi, 7L, 4-Mix', 4, 'Each',
      ['12,398.55', 1, null], ['19,238.18', 1, null], ['16,000.00', 1, null], ['12,355.56', 1, null]],
    ['Ride-on Lawn Mower/Cutter', 'Gasoline, zero turn, heavy duty', 2, 'Each',
      ['40,570.00', 1, null], ['181,858.50', 1, null], ['168,500.00', 1, null], ['56,995.00', 1, null]],
    ['Pole Pruner', 'Gasoline, 4-Mix, 16ft telescopic shaft', 3, 'Each',
      ['4,930.50', 1, null], ['6,656.18', 1, null], ['5,195.00', 1, null], ['4,675.00', 0, null]],
    /* Pillai quoted for 3 hedge trimmers against a requirement of 2
       ("Quoted (x3)") — a quantity variance the system must display. */
    ['Gas Hedge Trimmer', 'High power/high torque, gasoline, 2-Mix', 2, 'Each',
      ['5,120.50', 1, null], ['6,912.68', 1, 3], ['3,600.00', 1, null], ['2,724.44', 1, null]],
    ['Chain Saw', '', 2, 'Each',
      ['5,367.50', 0, null], ['7,246.13', 1, null], ['5,695.00', 1, null], ['5,495.00', 0, null]]
  ];
  rows.forEach(function (r, i) {
    ev.items.push({ desc: r[0], variant: r[1], qty: r[2], unitName: r[3] });
    for (let s = 0; s < 4; s++) {
      const c = r[4 + s];
      ev.cells.push({
        item: i, supplier: s, unit: c[0], vatable: !!c[1],
        quotedQty: c[2], packSize: null, note: '', compliant: true, complianceNote: ''
      });
    }
  });
  return ev;
}

module.exports = { pantryEvaluation, minorEquipmentEvaluation };

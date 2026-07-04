/* fixtures.js — representative v1 (Approvals_Composer) case states used by
   the unit tests and the legacy-parity test. Kept in the legacy flat shape
   deliberately: these are also the inputs for the v1 -> v2 migration tests. */
'use strict';

function blankV1() {
  return {
    formation: 'TRINIDAD AND TOBAGO COAST GUARD', lhlines: '', prelh: false,
    ref: '', date: '', handdate: false, addr: '', subject: '', subjectProse: '',
    signame: '', sigrank: '', sigapp: '', sigform: '',
    minfile: '', minsheet: '1a', minaddr: 'Permanent Secretary (Accounting Officer)',
    minufs: 'Ufs AOV', minsigname: '', minsigpost: '',
    method: 'Request for Quotation',
    act: 'Public Procurement and Disposal of Public Property Act, Act No. 1 of 2015, Part IV, Section 10 (Request for Quotation)',
    rfqdate: '', deadline: '', methodjust: '', urgency: 'Normal',
    need: '', r_comm: true, r_tech: true, r_low: true, r_alt: '', notlowest: '',
    vat: '', vote: '', funds: '', minextra: '',
    da_target: 'need', da_activity: '', da_who: '', da_when: '', da_cons: '', da_notes: '',
    items: [], attachments: [], folios: []
  };
}

/* 1 — single supplier, quantity mode, everything complete (all checks pass). */
function shoesCase() {
  const st = blankV1();
  st.ref = 'CG: 5/4/7';
  st.date = '2026-06-10';
  st.addr = 'Permanent Secretary\nMinistry of National Security\nTemple Court 2\n52-60 Abercromby Street\nPORT OF SPAIN';
  st.subject = 'APPROVAL TO PURCHASE UNIFORM ITEMS (BLACK SHOES AND WHITE SHOES)';
  st.signame = 'S. White'; st.sigrank = 'Lieutenant Commander'; st.sigapp = 'Supply Officer';
  st.sigform = 'Trinidad and Tobago Coast Guard';
  st.lhlines = 'C/O CARENAGE POST OFFICE\nREPUBLIC OF TRINIDAD AND TOBAGO\nWEST INDIES';
  st.minfile = 'MOD/PROC: 22/15/9: 2026';
  st.rfqdate = '2026-05-20'; st.deadline = '2026-06-03';
  st.need = 'Black Shoes and White Shoes are compulsory items of kit required by Ratings and Officers of the Trinidad and Tobago Coast Guard.';
  st.vat = 'VAT Exclusive (VAT shown separately)';
  st.vote = '02 Goods and Services, 006 Coast Guard, 03 - Uniform';
  st.funds = '250000.00';
  st.items = [
    {
      desc: 'Black Shoes', qty: '120', unitname: 'pairs', mode: 'qty', quotes: [
        { supplier: 'Alpha Footwear Ltd', status: 'Quoted', qty: '120', unit: '450.00', sub: '', vat: '6750.00', compliant: 'Yes', recommended: true, address: '#12 Sea View Gardens, Carenage', mode: 'qty' },
        { supplier: 'Beta Uniform Supplies', status: 'Quoted', qty: '120', unit: '505.00', sub: '', vat: '7575.00', compliant: 'Yes', recommended: false, address: '', mode: 'qty' },
        { supplier: 'Gamma Trading', status: 'Did Not Quote', qty: '120', unit: '', sub: '', vat: '', compliant: 'Yes', recommended: false, address: '', mode: 'qty' }
      ]
    },
    {
      desc: 'White Shoes', qty: '80', unitname: 'pairs', mode: 'qty', quotes: [
        { supplier: 'Alpha Footwear Ltd', status: 'Quoted', qty: '80', unit: '430.00', sub: '', vat: '4300.00', compliant: 'Yes', recommended: true, address: '#12 Sea View Gardens, Carenage', mode: 'qty' },
        { supplier: 'Beta Uniform Supplies', status: 'No Response', qty: '80', unit: '', sub: '', vat: '', compliant: 'Yes', recommended: false, address: '', mode: 'qty' }
      ]
    }
  ];
  st.attachments = [
    'Quotation received from Alpha Footwear Ltd',
    'Quotation received from Beta Uniform Supplies',
    'Request for Quotation sent to Alpha Footwear Ltd',
    'Request for Quotation sent to Beta Uniform Supplies',
    'Request for Quotation sent to Gamma Trading'
  ];
  st.folios = [
    { desc: 'Quotation received from Alpha Footwear Ltd', date: '03/06/26' },
    { desc: 'Quotation received from Beta Uniform Supplies', date: '02/06/26' }
  ];
  return st;
}

/* 2 — split award across suppliers, one amount-mode item. */
function splitAwardCase() {
  const st = shoesCase();
  st.subject = 'APPROVAL TO PURCHASE MATERIALS AND PROMOTIONAL ITEMS';
  st.items = [
    {
      desc: 'Garden Hose 100ft', qty: '4', unitname: 'each', mode: 'qty', quotes: [
        { supplier: 'J. Chai Trading Co. Ltd', status: 'Quoted', qty: '4', unit: '295.00', sub: '', vat: '147.50', compliant: 'Yes', recommended: true, address: 'Port of Spain', mode: 'qty' },
        { supplier: 'Pillai Tools Company Ltd', status: 'Quoted', qty: '4', unit: '340.00', sub: '', vat: '170.00', compliant: 'Yes', recommended: false, address: '', mode: 'qty' }
      ]
    },
    {
      desc: 'Wheel Barrow', qty: '8', unitname: 'each', mode: 'qty', quotes: [
        { supplier: 'A. Moses & Sons Limited', status: 'Quoted', qty: '8', unit: '495.00', sub: '', vat: '495.00', compliant: 'Yes', recommended: true, address: 'San Fernando', mode: 'qty' },
        { supplier: 'J. Chai Trading Co. Ltd', status: 'Quoted', qty: '8', unit: '515.00', sub: '', vat: '515.00', compliant: 'Yes', recommended: false, address: '', mode: 'qty' }
      ]
    },
    {
      desc: 'Promotional Items for Public Service Week', qty: '', unitname: '', mode: 'amount', quotes: [
        { supplier: 'Print Express Ltd', status: 'Quoted', qty: '', unit: '', sub: '7312.50', vat: '914.06', compliant: 'Yes', recommended: true, address: 'Arima', mode: 'amount' },
        { supplier: 'Banner World', status: 'Did Not Quote', qty: '', unit: '', sub: '', vat: '', compliant: 'Yes', recommended: false, address: '', mode: 'amount' }
      ]
    }
  ];
  st.attachments = [
    'Quotation received from J. Chai Trading Co. Ltd',
    'Quotation received from Pillai Tools Company Ltd',
    'Quotation received from A. Moses & Sons Limited',
    'Quotation received from Print Express Ltd',
    'Request for Quotation sent to Banner World'
  ];
  st.folios = st.attachments.map(function (a) { return { desc: a, date: '01/06/26' }; });
  return st;
}

/* 3 — failing case: missing fields, invalid figure, non-lowest without
   justification, dates out of order. */
function failingCase() {
  const st = blankV1();
  st.subject = 'INCOMPLETE PACK';
  st.rfqdate = '2026-06-20'; st.deadline = '2026-06-01';
  st.items = [
    {
      desc: 'Cable', qty: '10', unitname: 'metres', mode: 'qty', quotes: [
        { supplier: 'A Ltd', status: 'Quoted', qty: '10', unit: 'abc', sub: '', vat: '', compliant: 'Yes', recommended: false, address: '', mode: 'qty' },
        { supplier: 'B Ltd', status: 'Quoted', qty: '10', unit: '90.00', sub: '', vat: '', compliant: 'Yes', recommended: false, address: '', mode: 'qty' },
        { supplier: 'C Ltd', status: 'Quoted', qty: '10', unit: '120.00', sub: '', vat: '', compliant: 'Yes', recommended: true, address: '', mode: 'qty' }
      ]
    }
  ];
  return st;
}

/* 4 — direct contracting with justification, VAT Inclusive with a line VAT
   (triggers the double-count caution), fractional quantity. */
function directCase() {
  const st = shoesCase();
  st.method = 'Direct Contracting';
  st.act = 'Public Procurement and Disposal of Public Property Act, Act No. 1 of 2015 (Direct Contracting)';
  st.methodjust = 'The manufacturer is the sole authorised distributor of the required spare part in Trinidad and Tobago.';
  st.vat = 'VAT Inclusive';
  st.items = [
    {
      desc: 'Engine spare part', qty: '2.5', unitname: 'metres', mode: 'qty', quotes: [
        { supplier: 'Sole Source Ltd', status: 'Quoted', qty: '2.5', unit: '333.33', sub: '', vat: '50.00', compliant: 'Yes', recommended: true, address: 'Chaguanas', mode: 'qty' }
      ]
    }
  ];
  st.attachments = ['Quotation received from Sole Source Ltd'];
  st.folios = [{ desc: 'Quotation received from Sole Source Ltd', date: '05/06/26' }];
  return st;
}

/* 5 — funds shortfall (funds < total). */
function shortfallCase() {
  const st = shoesCase();
  st.funds = '10000.00';
  return st;
}

module.exports = { blankV1, shoesCase, splitAwardCase, failingCase, directCase, shortfallCase };

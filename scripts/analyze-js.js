const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'captures', 'staff_page.html'), 'utf8');

// Find all occurrences of /staff/... with surrounding context (e.g. $.post, $.ajax, url: ...)
const endpointDetails = {};

const regex = /['"](\/staff\/[a-zA-Z0-9_\-\/]+)['"]/g;
let m;
const uniqueEndpoints = new Set();

while ((m = regex.exec(html)) !== null) {
  const ep = m[1];
  uniqueEndpoints.add(ep);

  if (!endpointDetails[ep]) {
    endpointDetails[ep] = {
      endpoint: ep,
      contexts: []
    };
  }

  // Grab 250 characters surrounding this occurrence
  const start = Math.max(0, m.index - 100);
  const end = Math.min(html.length, m.index + 200);
  const snippet = html.substring(start, end).replace(/\s+/g, ' ').trim();
  if (endpointDetails[ep].contexts.length < 3) {
    endpointDetails[ep].contexts.push(snippet);
  }
}

// Categorize all endpoints
const taxonomy = {
  authentication_and_institute: [],
  faculty_and_centre_heads: [],
  students_and_parents: [],
  question_papers_and_bank: [],
  online_exams_and_scheduling: [],
  evaluation_and_reports: [],
  omr_sheet_processing: [],
  study_materials_and_notices: []
};

Array.from(uniqueEndpoints).sort().forEach(ep => {
  const item = endpointDetails[ep];
  if (ep.includes('insti') || ep.includes('cap') || ep.includes('promo') || ep.includes('usage') || ep.includes('verify')) {
    taxonomy.authentication_and_institute.push(item);
  } else if (ep.includes('fac') || ep.includes('ch') || ep.includes('cheads') || ep.includes('clbr') || ep.includes('centre') || ep.includes('class') || ep.includes('subj') || ep.includes('extype')) {
    taxonomy.faculty_and_centre_heads.push(item);
  } else if (ep.includes('stud') || ep.includes('parent')) {
    taxonomy.students_and_parents.push(item);
  } else if (ep.includes('qpap') || ep.includes('qstn') || ep.includes('qbank') || ep.includes('txtqs') || ep.includes('testcases')) {
    taxonomy.question_papers_and_bank.push(item);
  } else if (ep.includes('onex') || ep.includes('qexam') || ep.includes('exam') || ep.includes('sproc')) {
    taxonomy.online_exams_and_scheduling.push(item);
  } else if (ep.includes('res') || ep.includes('report') || ep.includes('anal') || ep.includes('subm') || ep.includes('absentee') || ep.includes('subjective')) {
    taxonomy.evaluation_and_reports.push(item);
  } else if (ep.includes('omr') || ep.includes('scans')) {
    taxonomy.omr_sheet_processing.push(item);
  } else if (ep.includes('video') || ep.includes('note') || ep.includes('notice') || ep.includes('mess')) {
    taxonomy.study_materials_and_notices.push(item);
  } else {
    taxonomy.authentication_and_institute.push(item);
  }
});

fs.writeFileSync(
  path.join(__dirname, '..', 'captures', 'staff_api_taxonomy.json'),
  JSON.stringify(taxonomy, null, 2)
);

console.log('--- API Taxonomy Generated ---');
for (const [cat, eps] of Object.entries(taxonomy)) {
  console.log(`${cat}: ${eps.length} endpoints`);
}

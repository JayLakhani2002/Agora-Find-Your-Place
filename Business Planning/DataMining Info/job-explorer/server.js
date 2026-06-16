const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3333;
const BA_BASE = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs';
const BA_KEY = 'jobboerse-jobsuche';
const ARBEITNOW_BASE = 'https://www.arbeitnow.com/api/job-board-api';

// BA arbeitszeit codes
const JOB_TYPE_TO_BA = {
  werkstudent: 'tz',
  teilzeit: 'tz',
  minijob: 'mj',
  vollzeit: 'vz',
};

// Arbeitnow job_types values that indicate student / part-time work
const AN_STUDENT_TYPES = ['working student', 'student', 'hilfstätigkeit', 'side', 'part', 'intern'];

async function fetchBA({ keyword, location, radius, jobTypes }) {
  const baCodes = [...new Set((jobTypes || []).map(t => JOB_TYPE_TO_BA[t]).filter(Boolean))];

  // Build URL manually to avoid semicolon encoding
  let url = `${BA_BASE}?wo=${encodeURIComponent(location || 'Berlin')}&umkreis=${radius || 25}&angebotsart=1&page=1&size=50`;
  if (baCodes.length > 0) url += `&arbeitszeit=${baCodes.join(';')}`;
  if (keyword) url += `&was=${encodeURIComponent(keyword)}`;

  console.log('[BA] GET', url);
  const res = await fetch(url, { headers: { 'X-API-Key': BA_KEY } });
  if (!res.ok) throw new Error(`BA API ${res.status}: ${await res.text().then(t => t.slice(0, 200))}`);

  const data = await res.json();
  const items = data.ergebnisliste || [];
  console.log(`[BA] ${items.length} jobs returned (${data.maxErgebnisse} total available)`);

  return items.map(job => {
    const loc = job.stellenlokationen?.[0]?.adresse;
    const jobTypeLabels = [];
    if (job.arbeitszeitVollzeit) jobTypeLabels.push('Vollzeit');
    if (job.istGeringfuegigeBeschaeftigung) jobTypeLabels.push('Minijob');
    if (job.arbeitszeitTeilzeitVormittag || job.arbeitszeitTeilzeitNachmittag ||
        job.arbeitszeitTeilzeitAbend || job.arbeitszeitTeilzeitFlexibel) jobTypeLabels.push('Teilzeit');

    return {
      id: `ba_${job.referenznummer}`,
      source: 'arbeitsagentur',
      sourceLabel: 'Bundesagentur',
      title: job.stellenangebotsTitel || 'Untitled',
      company: job.firma || '—',
      location: loc ? [loc.ort, loc.plz].filter(Boolean).join(' ') : (location || 'Berlin'),
      jobType: jobTypeLabels,
      postedAt: job.datumErsteVeroeffentlichung || null,
      applyUrl: job.externeURL || `https://www.arbeitsagentur.de/jobsuche/suche?id=${encodeURIComponent(job.referenznummer || '')}`,
      tags: [],
      salary: null,
      remote: job.homeofficemoeglich || false,
    };
  });
}

async function fetchArbeitnow({ keyword, jobTypes, pages = 3 }) {
  const kw = (keyword || '').toLowerCase();
  const wantsMinijob = (jobTypes || []).includes('minijob');
  const wantsVollzeit = (jobTypes || []).includes('vollzeit');

  const allJobs = [];

  for (let page = 1; page <= pages; page++) {
    console.log(`[Arbeitnow] Fetching page ${page}...`);
    const res = await fetch(`${ARBEITNOW_BASE}?page=${page}`);
    if (!res.ok) throw new Error(`Arbeitnow API ${res.status}`);
    const data = await res.json();
    if (!data.data?.length) break;
    allJobs.push(...data.data);
  }

  console.log(`[Arbeitnow] ${allJobs.length} total jobs fetched across ${pages} pages`);

  const filtered = allJobs.filter(job => {
    const titleLower = (job.title || '').toLowerCase();
    const types = (job.job_types || []).map(t => t.toLowerCase());

    // Check if job matches student/werkstudent/minijob type
    const isStudentType =
      titleLower.includes('werkstudent') ||
      titleLower.includes('studentenjob') ||
      titleLower.includes('student job') ||
      types.some(t => AN_STUDENT_TYPES.some(s => t.includes(s)));

    const isMinijob = titleLower.includes('minijob') || types.some(t => t.includes('mini'));
    const isPartTime = titleLower.includes('teilzeit') || types.some(t => t.includes('part'));
    const isFullTime = job.arbeitszeitVollzeit || types.some(t => t.includes('full'));

    // Filter by selected job types
    let matches = false;
    if ((jobTypes || []).includes('werkstudent') && isStudentType) matches = true;
    if (wantsMinijob && isMinijob) matches = true;
    if ((jobTypes || []).includes('teilzeit') && isPartTime) matches = true;
    if (wantsVollzeit && isFullTime) matches = true;

    if (!matches) return false;

    // Keyword filter
    if (kw) {
      return titleLower.includes(kw) ||
        (job.description || '').toLowerCase().includes(kw) ||
        (job.company_name || '').toLowerCase().includes(kw);
    }
    return true;
  });

  console.log(`[Arbeitnow] ${filtered.length} jobs after filter`);

  return filtered.map(job => ({
    id: `an_${job.slug}`,
    source: 'arbeitnow',
    sourceLabel: 'Arbeitnow',
    title: job.title,
    company: job.company_name || '—',
    location: job.location || 'Germany',
    jobType: job.job_types || [],
    postedAt: job.created_at
      ? new Date(job.created_at * 1000).toISOString().split('T')[0]
      : null,
    applyUrl: job.url,
    tags: job.tags || [],
    salary: null,
    remote: job.remote || false,
  }));
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'GET' && req.url === '/') {
    try {
      const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch {
      res.writeHead(500); res.end('index.html not found');
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/api/search') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      try {
        const params = JSON.parse(body || '{}');
        const sources = params.sources || ['arbeitsagentur', 'arbeitnow'];

        const fetches = [];
        if (sources.includes('arbeitsagentur')) fetches.push({ src: 'arbeitsagentur', fn: fetchBA(params) });
        if (sources.includes('arbeitnow')) fetches.push({ src: 'arbeitnow', fn: fetchArbeitnow(params) });

        const results = await Promise.allSettled(fetches.map(f => f.fn));

        const jobs = [];
        const errors = [];

        results.forEach((r, i) => {
          if (r.status === 'fulfilled') {
            jobs.push(...r.value);
          } else {
            const src = fetches[i].src;
            const msg = r.reason?.message || 'Unknown error';
            errors.push(`${src}: ${msg}`);
            console.error(`[${src}] Error:`, msg);
          }
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jobs, total: jobs.length, errors }));
      } catch (err) {
        console.error('[Server] Error:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message, jobs: [], total: 0, errors: [] }));
      }
    });
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║   Agora Jobs Explorer — Running      ║');
  console.log(`  ║   http://localhost:${PORT}              ║`);
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
  console.log('  Sources: Bundesagentur für Arbeit + Arbeitnow');
  console.log('  Press Ctrl+C to stop');
  console.log('');
});

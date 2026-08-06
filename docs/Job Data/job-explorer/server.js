const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3333;

// ─── Source configs ──────────────────────────────────────────────────────────

const BA_BASE = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs';
const BA_KEY  = 'jobboerse-jobsuche';

const ARBEITNOW_BASE  = 'https://www.arbeitnow.com/api/job-board-api';
const HOTELCAREER_URL = 'https://www.hotelcareer.com/jobs/temporary-job-berlin';

// Odd-job keyword groups — each runs as a separate BA search, results merged + deduped
const BA_ODD_JOB_KEYWORDS = [
  { kw: 'Küchenhilfe',    domain: 'kitchen'   },
  { kw: 'Küchenhelfer',   domain: 'kitchen'   },
  { kw: 'Hilfskoch',      domain: 'kitchen'   },
  { kw: 'Spüler',         domain: 'kitchen'   },
  { kw: 'Spülkraft',      domain: 'kitchen'   },
  { kw: 'Servicekraft',   domain: 'service'   },
  { kw: 'Kellner',        domain: 'service'   },
  { kw: 'Barkeeper',      domain: 'bar'       },
  { kw: 'Housekeeping',   domain: 'hotel'     },
  { kw: 'Reinigungskraft',domain: 'cleaning'  },
  { kw: 'Zimmermädchen',  domain: 'hotel'     },
  { kw: 'Lagerhelfer',    domain: 'warehouse' },
  { kw: 'Kommissionierer',domain: 'warehouse' },
  { kw: 'Paketzusteller', domain: 'delivery'  },
  { kw: 'Zusteller',      domain: 'delivery'  },
  { kw: 'Aushilfe',       domain: 'general'   },
];

// Confirmed 200 Greenhouse slugs (Berlin-headquartered or Berlin-heavy companies)
const GREENHOUSE_COMPANIES = [
  { slug: 'hellofresh',     name: 'HelloFresh' },
  { slug: 'wooga',          name: 'Wooga' },
  { slug: 'contentful',     name: 'Contentful' },
  { slug: 'commercetools',  name: 'Commercetools' },
  { slug: 'traderepublic',  name: 'Trade Republic' },
  { slug: 'wunderkind',     name: 'Wunderkind' },
  { slug: 'n26',            name: 'N26' },
  { slug: 'solarisbank',    name: 'Solarisbank' },
  { slug: 'raisin',         name: 'Raisin' },
  { slug: 'staffbase',      name: 'Staffbase' },
  { slug: 'scout24',        name: 'Scout24' },
  { slug: 'flaconi',        name: 'Flaconi' },
  { slug: 'grover',         name: 'Grover' },
  { slug: 'heycar',         name: 'HeyCAR' },
  { slug: 'getyourguide',   name: 'GetYourGuide' },
  { slug: 'sumup',          name: 'SumUp' },
  { slug: 'moonfare',       name: 'Moonfare' },
  { slug: 'carbonfuture',   name: 'CarbonFuture' },
  { slug: 'parloa',         name: 'Parloa' },
  { slug: 'celonis',        name: 'Celonis' },
  { slug: 'reachdesk',      name: 'Reachdesk' },
  { slug: 'trivago',        name: 'Trivago' },
  { slug: 'vay',            name: 'Vay' },
];

// Confirmed 200 Ashby slugs
const ASHBY_COMPANIES = [
  { slug: 'lemon-markets', name: 'Lemon Markets' },
  { slug: 'preply',        name: 'Preply' },
  { slug: 'choco',         name: 'Choco' },
  { slug: 'enpal',         name: 'Enpal' },
  { slug: 'billie',        name: 'Billie' },
  { slug: 'forto',         name: 'Forto' },
  { slug: 'flink',         name: 'Flink' },
  { slug: 'snyk',          name: 'Snyk' },
  { slug: 'weaviate',      name: 'Weaviate' },
  { slug: 'humanitec',     name: 'Humanitec' },
];

// Confirmed 200 Recruitee slugs
const RECRUITEE_COMPANIES = [
  { slug: 'rebuy',       name: 'Rebuy' },
  { slug: 'kfzteile24', name: 'KFZ-Teile24' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const JOB_TYPE_TO_BA = {
  werkstudent: 'tz',
  teilzeit:    'tz',
  minijob:     'mj',
  vollzeit:    'vz',
};

const AN_STUDENT_TYPES = ['working student', 'student', 'hilfstätigkeit', 'side', 'part', 'intern'];

// Title keywords that indicate a student/intern position across all ATS sources
const STUDENT_TITLE_KEYWORDS = [
  'werkstudent', 'working student', 'studentenjob', 'student job',
  'praktikum', 'praktikant', 'internship', 'intern ', '(intern)',
  'trainee', 'werkstud', 'student (m', 'student (f',
];

// Location match: accept if job location contains search location, Germany, or Remote
function matchesLocation(jobLocationStr, searchLocation) {
  const jl  = (jobLocationStr || '').toLowerCase();
  const sl  = (searchLocation || 'berlin').toLowerCase();
  if (!jl) return true; // no location = assume global/remote = accept
  return jl.includes(sl) || jl.includes('germany') || jl.includes('deutschland') ||
         jl.includes('remote') || jl.includes('hybrid');
}

function matchesKeyword(str, kw) {
  if (!kw) return true;
  return (str || '').toLowerCase().includes(kw.toLowerCase());
}

// ─── Bundesagentur für Arbeit ────────────────────────────────────────────────

async function fetchBA({ keyword, location, radius, jobTypes }) {
  const codes = [...new Set((jobTypes || []).map(t => JOB_TYPE_TO_BA[t]).filter(Boolean))];
  let url = `${BA_BASE}?wo=${encodeURIComponent(location || 'Berlin')}&umkreis=${radius || 25}&angebotsart=1&page=1&size=50`;
  if (codes.length) url += `&arbeitszeit=${codes.join(';')}`;
  if (keyword)      url += `&was=${encodeURIComponent(keyword)}`;

  console.log('[BA] GET', url);
  const res = await fetch(url, { headers: { 'X-API-Key': BA_KEY } });
  if (!res.ok) throw new Error(`BA ${res.status}`);

  const data = await res.json();
  const items = data.ergebnisliste || [];
  console.log(`[BA] ${items.length} / ${data.maxErgebnisse} total`);

  return items.map(j => {
    const loc  = j.stellenlokationen?.[0]?.adresse;
    const types = [];
    if (j.arbeitszeitVollzeit) types.push('Vollzeit');
    if (j.istGeringfuegigeBeschaeftigung) types.push('Minijob');
    if (j.arbeitszeitTeilzeitVormittag || j.arbeitszeitTeilzeitNachmittag ||
        j.arbeitszeitTeilzeitAbend    || j.arbeitszeitTeilzeitFlexibel)   types.push('Teilzeit');

    return {
      id:          `ba_${j.referenznummer}`,
      source:      'arbeitsagentur',
      sourceLabel: 'Bundesagentur',
      title:       j.stellenangebotsTitel || 'Untitled',
      company:     j.firma || '—',
      location:    loc ? [loc.ort, loc.plz].filter(Boolean).join(' ') : (location || 'Berlin'),
      jobType:     types,
      postedAt:    j.datumErsteVeroeffentlichung || null,
      applyUrl:    j.externeURL || `https://www.arbeitsagentur.de/jobsuche/suche?id=${encodeURIComponent(j.referenznummer || '')}`,
      tags:        [],
      salary:      null,
      remote:      j.homeofficemoeglich || false,
    };
  });
}

// ─── Arbeitnow ───────────────────────────────────────────────────────────────

async function fetchArbeitnow({ keyword, jobTypes, pages = 8 }) {
  const wantsWerk     = (jobTypes || []).includes('werkstudent');
  const wantsMinijob  = (jobTypes || []).includes('minijob');
  const wantsTeilzeit = (jobTypes || []).includes('teilzeit');
  const wantsVollzeit = (jobTypes || []).includes('vollzeit');

  const all = [];
  for (let p = 1; p <= pages; p++) {
    console.log(`[Arbeitnow] page ${p}`);
    const res = await fetch(`${ARBEITNOW_BASE}?page=${p}`);
    if (!res.ok) throw new Error(`Arbeitnow ${res.status}`);
    const data = await res.json();
    if (!data.data?.length) break;
    all.push(...data.data);
  }

  const kw = (keyword || '').toLowerCase();

  const filtered = all.filter(job => {
    const title = (job.title || '').toLowerCase();
    const types = (job.job_types || []).map(t => t.toLowerCase());

    const isStudent  = title.includes('werkstudent') || title.includes('studentenjob') ||
                       types.some(t => AN_STUDENT_TYPES.some(s => t.includes(s)));
    const isMinijob  = title.includes('minijob') || types.some(t => t.includes('mini'));
    const isTeilzeit = title.includes('teilzeit') || types.some(t => t.includes('part'));
    const isVollzeit = types.some(t => t.includes('full'));

    let ok = false;
    if (wantsWerk     && isStudent)  ok = true;
    if (wantsMinijob  && isMinijob)  ok = true;
    if (wantsTeilzeit && isTeilzeit) ok = true;
    if (wantsVollzeit && isVollzeit) ok = true;
    if (!ok) return false;

    return kw ? (title.includes(kw) || (job.description || '').toLowerCase().includes(kw) ||
                 (job.company_name || '').toLowerCase().includes(kw)) : true;
  });

  console.log(`[Arbeitnow] ${all.length} fetched → ${filtered.length} matched`);

  return filtered.map(j => ({
    id:          `an_${j.slug}`,
    source:      'arbeitnow',
    sourceLabel: 'Arbeitnow',
    title:       j.title,
    company:     j.company_name || '—',
    location:    j.location || 'Germany',
    jobType:     j.job_types || [],
    postedAt:    j.created_at ? new Date(j.created_at * 1000).toISOString().split('T')[0] : null,
    applyUrl:    j.url,
    tags:        j.tags || [],
    salary:      null,
    remote:      j.remote || false,
  }));
}

// ─── BA Odd Jobs (keyword-based parallel searches) ───────────────────────────

async function fetchBAOddJobKeyword({ kw, domain, location, radius }) {
  const url = `${BA_BASE}?wo=${encodeURIComponent(location || 'Berlin')}&umkreis=${radius || 25}&angebotsart=1&arbeitszeit=mj;tz&page=1&size=25&was=${encodeURIComponent(kw)}`;
  const res = await fetch(url, { headers: { 'X-API-Key': BA_KEY } });
  if (!res.ok) return [];
  const data = await res.json();

  return (data.ergebnisliste || []).map(j => {
    const loc   = j.stellenlokationen?.[0]?.adresse;
    const types = [];
    if (j.istGeringfuegigeBeschaeftigung) types.push('Minijob');
    if (j.arbeitszeitTeilzeitVormittag || j.arbeitszeitTeilzeitNachmittag ||
        j.arbeitszeitTeilzeitAbend    || j.arbeitszeitTeilzeitFlexibel)   types.push('Teilzeit');
    if (j.arbeitszeitVollzeit && !types.length) types.push('Vollzeit');
    return {
      id:          `ba_oddjob_${j.referenznummer}`,
      source:      'ba_oddjobs',
      sourceLabel: 'Bundesagentur',
      title:       j.stellenangebotsTitel || 'Untitled',
      company:     j.firma || '—',
      location:    loc ? [loc.ort, loc.plz].filter(Boolean).join(' ') : (location || 'Berlin'),
      jobType:     types,
      domain,
      postedAt:    j.datumErsteVeroeffentlichung || null,
      applyUrl:    j.externeURL || `https://www.arbeitsagentur.de/jobsuche/suche?id=${encodeURIComponent(j.referenznummer || '')}`,
      tags:        [kw.toLowerCase()],
      salary:      null,
      remote:      j.homeofficemoeglich || false,
    };
  });
}

async function fetchBAOddJobs({ keyword, location, radius }) {
  // Filter keywords if user typed a keyword — only search relevant domains
  let keywords = BA_ODD_JOB_KEYWORDS;
  if (keyword) {
    const kw = keyword.toLowerCase();
    const filtered = keywords.filter(k => k.kw.toLowerCase().includes(kw) || k.domain.includes(kw));
    if (filtered.length) keywords = filtered;
  }

  console.log(`[BA OddJobs] Searching ${keywords.length} keyword groups in parallel`);
  const results = await Promise.allSettled(
    keywords.map(k => fetchBAOddJobKeyword({ ...k, location, radius }))
  );

  const all  = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  // Deduplicate within this source by referenznummer
  const seen = new Set();
  const deduped = all.filter(j => {
    const key = j.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.log(`[BA OddJobs] ${all.length} raw → ${deduped.length} after dedup`);
  return deduped;
}

// ─── Hotelcareer ─────────────────────────────────────────────────────────────

async function fetchHotelcareer({ keyword }) {
  console.log('[Hotelcareer] Fetching Berlin hospitality jobs');
  const res = await fetch(HOTELCAREER_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`Hotelcareer ${res.status}`);
  const html = await res.text();

  // Extract job blocks: <a href="/jobs/..."><h2 class="font-size-l">TITLE</h2></a><em>COMPANY</em><div class="ycg-job-metadata ...">...location...type...date...</div>
  const blockRe = /<a\s+href="(\/jobs\/[^"]+)"[^>]*>\s*<h2[^>]*>([^<]+)<\/h2>\s*<\/a>\s*<em>([^<]*)<\/em>[\s\S]*?<div class="ycg-job-metadata[^>]*>([\s\S]*?)<\/div>/gi;

  const jobs = [];
  let m;
  while ((m = blockRe.exec(html)) !== null) {
    const [, href, title, company, metaBlock] = m;

    const locMatch  = metaBlock.match(/ycg-i-location[^>]*><\/i>([^<]+)/);
    const typeMatch = metaBlock.match(/ycg-i-info[^>]*><\/i>([^<]+)/);
    const dateMatch = metaBlock.match(/ycg-i-calendar[^>]*><\/i>([^<]+)/);

    const location = locMatch?.[1]?.trim() || 'Berlin';
    const jobType  = typeMatch?.[1]?.trim() || '';
    const dateRaw  = dateMatch?.[1]?.trim() || null;

    // Parse MM/DD/YYYY → YYYY-MM-DD
    let postedAt = null;
    if (dateRaw) {
      const parts = dateRaw.split('/');
      if (parts.length === 3) postedAt = `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`;
    }

    // Keyword filter
    if (keyword) {
      const kw = keyword.toLowerCase();
      if (!title.toLowerCase().includes(kw) && !company.toLowerCase().includes(kw)) continue;
    }

    jobs.push({
      id:          `hc_${href.replace(/\W+/g, '_')}`,
      source:      'hotelcareer',
      sourceLabel: 'Hotelcareer',
      title:       title.trim(),
      company:     company.trim() || '—',
      location,
      jobType:     jobType ? [jobType] : [],
      domain:      'hospitality',
      postedAt,
      applyUrl:    `https://www.hotelcareer.com${href}`,
      tags:        ['hospitality', 'berlin'],
      salary:      null,
      remote:      false,
    });
  }

  console.log(`[Hotelcareer] ${jobs.length} jobs parsed`);
  return jobs;
}

// ─── Greenhouse ──────────────────────────────────────────────────────────────

function isStudentTitle(title) {
  const tl = (title || '').toLowerCase();
  return STUDENT_TITLE_KEYWORDS.some(k => tl.includes(k));
}

async function fetchGreenhouseCompany(company, { keyword, location, jobTypes }) {
  const res = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${company.slug}/jobs?content=false`
  );
  if (!res.ok) {
    console.warn(`[GH] ${company.slug} → ${res.status}`);
    return [];
  }
  const data = await res.json();

  const wantsWerk     = (jobTypes || []).includes('werkstudent');
  const wantsVollzeit = (jobTypes || []).includes('vollzeit');
  const wantsTeilzeit = (jobTypes || []).includes('teilzeit');
  const hasTypeFilter = (jobTypes || []).length > 0;

  return (data.jobs || [])
    .filter(j => {
      if (!matchesLocation(j.location?.name, location)) return false;
      if (!matchesKeyword(j.title, keyword))            return false;
      if (!hasTypeFilter) return true;
      const tl = (j.title || '').toLowerCase();
      if (wantsWerk     && isStudentTitle(j.title))                    return true;
      if (wantsTeilzeit && (isStudentTitle(j.title) || tl.includes('part'))) return true;
      if (wantsVollzeit && !isStudentTitle(j.title))                   return true;
      return false;
    })
    .map(j => ({
      id:          `gh_${company.slug}_${j.id}`,
      source:      'greenhouse',
      sourceLabel: company.name,
      title:       j.title,
      company:     company.name,
      location:    j.location?.name || 'Germany',
      jobType:     [],
      postedAt:    j.first_published ? j.first_published.split('T')[0] : null,
      applyUrl:    j.absolute_url,
      tags:        [],
      salary:      null,
      remote:      false,
    }));
}

async function fetchGreenhouse(params) {
  console.log(`[GH] Fetching ${GREENHOUSE_COMPANIES.length} companies in parallel`);
  const results = await Promise.allSettled(
    GREENHOUSE_COMPANIES.map(c => fetchGreenhouseCompany(c, params))
  );
  const jobs = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  console.log(`[GH] ${jobs.length} jobs after location+keyword filter`);
  return jobs;
}

// ─── Ashby ───────────────────────────────────────────────────────────────────

async function fetchAshbyCompany(company, { keyword, location, jobTypes }) {
  const res = await fetch(
    `https://api.ashbyhq.com/posting-api/job-board/${company.slug}?includeCompensation=true`
  );
  if (!res.ok) {
    console.warn(`[Ashby] ${company.slug} → ${res.status}`);
    return [];
  }
  const data = await res.json();

  const wantsPartTime = (jobTypes || []).some(t => ['werkstudent', 'teilzeit', 'minijob'].includes(t));
  const wantsFullTime = (jobTypes || []).includes('vollzeit');

  return (data.jobs || [])
    .filter(j => {
      if (!matchesLocation(j.location, location) && !j.isRemote) return false;
      if (!matchesKeyword(j.title, keyword))                      return false;
      if (!wantsPartTime && !wantsFullTime) return true; // no type filter = show all
      const et = (j.employmentType || '').toLowerCase();
      const titleIsStudent = isStudentTitle(j.title);
      // Part-time / student: match by employmentType OR title keywords
      if (wantsPartTime && (
        et === 'parttime' || et === 'intern' || et === 'contract' || titleIsStudent
      )) return true;
      // Full-time: match by employmentType AND title is not a student role
      if (wantsFullTime && et === 'fulltime' && !titleIsStudent) return true;
      return false;
    })
    .map(j => ({
      id:          `ashby_${company.slug}_${j.id}`,
      source:      'ashby',
      sourceLabel: company.name,
      title:       j.title,
      company:     company.name,
      location:    j.isRemote ? 'Remote' : (j.location || 'Germany'),
      jobType:     [j.employmentType || ''].filter(Boolean),
      postedAt:    j.publishedAt ? j.publishedAt.split('T')[0] : null,
      applyUrl:    j.jobUrl || j.applyUrl,
      tags:        [],
      salary:      j.compensation?.compensationTierSummary || null,
      remote:      j.isRemote || j.workplaceType === 'Remote',
    }));
}

async function fetchAshby(params) {
  console.log(`[Ashby] Fetching ${ASHBY_COMPANIES.length} companies in parallel`);
  const results = await Promise.allSettled(
    ASHBY_COMPANIES.map(c => fetchAshbyCompany(c, params))
  );
  const jobs = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  console.log(`[Ashby] ${jobs.length} jobs after filter`);
  return jobs;
}

// ─── Recruitee ───────────────────────────────────────────────────────────────

async function fetchRecruiteeCompany(company, { keyword, location, jobTypes }) {
  const res = await fetch(`https://${company.slug}.recruitee.com/api/offers/`);
  if (!res.ok) {
    console.warn(`[Recruitee] ${company.slug} → ${res.status}`);
    return [];
  }
  const data = await res.json();

  const wantsPartTime = (jobTypes || []).some(t => ['werkstudent', 'teilzeit', 'minijob'].includes(t));
  const kw = (keyword || '').toLowerCase();

  return (data.offers || [])
    .filter(j => {
      if (!matchesLocation(j.location, location)) return false;
      const tl = (j.title || '').toLowerCase();
      if (kw && !tl.includes(kw)) return false;
      if (wantsPartTime) {
        const hrs = parseFloat(j.max_hours_per_week || '40');
        const isPartTime = hrs < 36 || tl.includes('werkstudent') || tl.includes('teilzeit') ||
                           tl.includes('minijob') || tl.includes('part');
        return isPartTime;
      }
      return true;
    })
    .map(j => {
      const sal = j.salary?.min || j.salary?.max
        ? `${j.salary.min ? '€' + j.salary.min : ''}${j.salary.max ? '–€' + j.salary.max : ''} ${j.salary.period || ''}`.trim()
        : null;
      return {
        id:          `rc_${company.slug}_${j.id || j.slug}`,
        source:      'recruitee',
        sourceLabel: company.name,
        title:       j.title,
        company:     company.name,
        location:    j.location || 'Germany',
        jobType:     j.max_hours_per_week ? [`${j.max_hours_per_week}h/week`] : [],
        postedAt:    j.updated_at ? j.updated_at.split(' ')[0] : null,
        applyUrl:    j.careers_apply_url,
        tags:        [],
        salary:      sal,
        remote:      !j.on_site,
      };
    });
}

async function fetchRecruitee(params) {
  console.log(`[Recruitee] Fetching ${RECRUITEE_COMPANIES.length} companies in parallel`);
  const results = await Promise.allSettled(
    RECRUITEE_COMPANIES.map(c => fetchRecruiteeCompany(c, params))
  );
  const jobs = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  console.log(`[Recruitee] ${jobs.length} jobs after filter`);
  return jobs;
}

// ─── Source router ───────────────────────────────────────────────────────────

const SOURCE_FNS = {
  arbeitsagentur: fetchBA,
  arbeitnow:      fetchArbeitnow,
  ba_oddjobs:     fetchBAOddJobs,
  hotelcareer:    fetchHotelcareer,
  greenhouse:     fetchGreenhouse,
  ashby:          fetchAshby,
  recruitee:      fetchRecruitee,
};

// ─── HTTP server ─────────────────────────────────────────────────────────────

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
    } catch { res.writeHead(500); res.end('index.html not found'); }
    return;
  }

  // Return source metadata for the UI
  if (req.method === 'GET' && req.url === '/api/sources') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      arbeitsagentur: { label: 'Bundesagentur für Arbeit', count: '13,000+ live jobs', type: 'official' },
      arbeitnow:      { label: 'Arbeitnow',                count: '10,000+ jobs',      type: 'official' },
      greenhouse:     { label: 'Greenhouse ATS',           count: `${GREENHOUSE_COMPANIES.length} companies`, type: 'ats' },
      ashby:          { label: 'Ashby ATS',                count: `${ASHBY_COMPANIES.length} companies`,     type: 'ats' },
      recruitee:      { label: 'Recruitee ATS',            count: `${RECRUITEE_COMPANIES.length} companies`, type: 'ats' },
    }));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/search') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      try {
        const params  = JSON.parse(body || '{}');
        const sources = params.sources || Object.keys(SOURCE_FNS);

        console.log('\n── Search ──────────────────────────────');
        console.log('Sources:', sources.join(', '));
        console.log('Params:', JSON.stringify({ keyword: params.keyword, location: params.location, radius: params.radius, jobTypes: params.jobTypes }));

        const entries = sources.map(s => ({ src: s, fn: SOURCE_FNS[s] })).filter(e => e.fn);
        const results = await Promise.allSettled(entries.map(e => e.fn(params)));

        const jobs   = [];
        const errors = [];
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') jobs.push(...r.value);
          else {
            const msg = r.reason?.message || 'Unknown error';
            errors.push(`${entries[i].src}: ${msg}`);
            console.error(`[${entries[i].src}] Error:`, msg);
          }
        });

        // Deduplicate by title+company hash
        const seen = new Set();
        const deduped = jobs.filter(j => {
          const key = `${j.title}__${j.company}`.toLowerCase().replace(/\s/g, '');
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        console.log(`── Result: ${deduped.length} unique jobs (${jobs.length - deduped.length} dupes removed)`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jobs: deduped, total: deduped.length, errors }));
      } catch (err) {
        console.error('[Server]', err.message);
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
  console.log('  ╔══════════════════════════════════════════════════╗');
  console.log('  ║   Agora Jobs Explorer — Running                  ║');
  console.log(`  ║   http://localhost:${PORT}                         ║`);
  console.log('  ╠══════════════════════════════════════════════════╣');
  console.log('  ║  Werkstudent / Teilzeit sources:                 ║');
  console.log('  ║   • Bundesagentur für Arbeit (13,000+ jobs)      ║');
  console.log('  ║   • Arbeitnow (10,000+ jobs)                     ║');
  console.log(`  ║   • Greenhouse ATS (${GREENHOUSE_COMPANIES.length} Berlin companies)        ║`);
  console.log(`  ║   • Ashby ATS (${ASHBY_COMPANIES.length} companies)                  ║`);
  console.log(`  ║   • Recruitee ATS (${RECRUITEE_COMPANIES.length} companies)                ║`);
  console.log('  ║  Odd Jobs / Hospitality sources:                 ║');
  console.log(`  ║   • BA Odd Jobs (${BA_ODD_JOB_KEYWORDS.length} keyword categories)         ║`);
  console.log('  ║   • Hotelcareer.com (Berlin hospitality)         ║');
  console.log('  ║  Gig Platforms: Wolt · Lieferando · Amazon Flex  ║');
  console.log('  ╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log('  Press Ctrl+C to stop\n');
});

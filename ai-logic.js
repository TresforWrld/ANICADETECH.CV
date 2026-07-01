/* ════════════════════════════════════════════════════════════
   ANICADE.CV — ai-logic.js
   AI Writing Assistant logic: chat replies, text enhancement and
   spell-checking.

   Design goal: the assistant should ALWAYS give the user a useful
   answer, online or offline. It tries a free public service first
   (short timeout so the UI never hangs), and if that fails for any
   reason (no internet, service down, CORS, rate limit) it silently
   falls back to a large built-in offline knowledge base instead of
   surfacing an error. The "couldn't reach any writing service"
   message should now only ever appear if something truly
   unexpected happens.
   ════════════════════════════════════════════════════════════ */

(function () {

  /* ── HELPERS ─────────────────────────────────────────────── */

  /** Wrap a fetch call with a hard timeout so a dead network never
   *  leaves the assistant "thinking" forever. */
  function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs || 6000);
    return fetch(url, Object.assign({}, options, { signal: controller.signal }))
      .finally(() => clearTimeout(id));
  }

  function cleanText(t) {
    return (t || "").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  /* ── SUGGESTED QUESTIONS (also double as local KB triggers) ─ */
  const SUGGESTED_QUESTIONS = [
    "How do I write a strong CV summary?",
    "I have no work experience, what do I write?",
    "How do I make my CV pass ATS screening?",
    "How do I tailor my CV for a specific job?",
    "How do I explain a career gap?",
    "What are good action verbs for bullet points?",
    "How long should my CV be?",
    "Should I include a photo on my CV?",
    "What file format should I submit my CV in?",
    "How do I quantify my achievements?",
    "Do I need a cover letter too?",
    "What common CV mistakes should I avoid?",
  ];

  /* ── LOCAL OFFLINE KNOWLEDGE BASE ────────────────────────── */
  /* Each entry has keywords to match against the user's message
     and an answer (either a string or a function that receives the
     current form data so replies can reference the person's target
     role). Matching is keyword-scored so phrasing doesn't have to
     be exact. */
  const KB = [
    {
      keywords: ["summary", "profile", "about me", "personal statement", "intro", "introduction"],
      answer: (d) => `A strong CV summary is 2-4 sentences at the very top, written like a highlight reel, not a diary entry:
• Open with your job title/years of experience (e.g. "${d.targetRole ? "Detail-oriented " + d.targetRole : "Detail-oriented professional"} with 3+ years' experience...").
• Add 1-2 of your strongest, most relevant skills or achievements.
• Close with what you bring to an employer — the value, not just the duties.
Avoid generic filler like "hardworking team player" with nothing to back it up. Use the AI Enhance button under Professional Profile once you've drafted something — it'll tighten the wording for you.`
    },
    {
      keywords: ["no experience", "never worked", "first job", "no job history", "fresh graduate", "student cv", "entry level", "graduate"],
      answer: `No formal work history isn't a dead end — employers know first CVs look different:
• Lead with Education and any coursework, projects or dissertations relevant to the role.
• Include unpaid work: volunteering, class projects, family business help, school leadership roles (head boy/girl, club treasurer, etc.) — these show responsibility and initiative.
• List transferable skills: communication, teamwork, problem-solving, computer literacy — anything demonstrable.
• Add a short "Projects" entry even for personal ones (a website you built, an event you organised).
Your summary should focus on enthusiasm, willingness to learn, and any relevant skills rather than years of experience you don't have yet.`
    },
    {
      keywords: ["length", "how long", "how many pages", "one page", "two pages", "page limit"],
      answer: `One page is ideal if you have under ~8 years of experience; two pages is fine and normal for more senior or varied careers. Never pad a CV to hit a page count — a tight, focused one-pager beats a rambling two-pager every time. If you're going over two pages, look for older/less relevant roles you can shorten to one line or cut entirely.`
    },
    {
      keywords: ["skills", "key skills", "what skills"],
      answer: (d) => `List skills that are specific and provable, not vague adjectives:
• Mix hard skills (software, languages, technical tools) with a few relevant soft skills (leadership, negotiation, communication).
• Match wording to the job advert where honest — many employers scan for exact terms${d.targetRole ? ` relevant to a ${d.targetRole} role` : ""}.
• Aim for 8-12 skills, most relevant first.
• Avoid outdated basics like "Microsoft Word" unless the role is very entry-level — assume it's expected.`
    },
    {
      keywords: ["ats", "applicant tracking", "pass screening", "resume scanner", "keyword scan", "get rejected automatically"],
      answer: (d) => `To get past Applicant Tracking Systems (ATS):
• Use standard section headings (Experience, Education, Skills) — ATS software looks for these.
• Mirror keywords from the job description exactly where truthful${d.targetRole ? ` — for a ${d.targetRole} role, that usually means specific tools, certifications and responsibilities named in the posting` : ""}.
• Avoid tables, text boxes, headers/footers and images for critical info — some ATS can't read them (our templates are built to be ATS-safe already).
• Save/export as a standard format (our Export HTML button, or Print/PDF, both work well) rather than heavily designed graphics.
• Spell out acronyms at least once (e.g. "Search Engine Optimisation (SEO)").`
    },
    {
      keywords: ["action verb", "power word", "strong verb", "bullet point word", "start bullet"],
      answer: `Strong CV bullets start with a specific action verb, not "Responsible for" or "Duties included":
Led, Managed, Built, Designed, Launched, Streamlined, Increased, Reduced, Negotiated, Coordinated, Delivered, Implemented, Trained, Mentored, Resolved, Automated, Generated, Secured, Analysed, Presented.
Pattern: [Action verb] + [what you did] + [measurable result]. Example: "Streamlined the customer enquiry process, cutting response time by 30%."`
    },
    {
      keywords: ["quantify", "numbers", "metrics", "measurable", "results", "achievements", "impact"],
      answer: `Numbers make achievements believable and memorable. For every bullet, ask "how much, how many, how often, or by what %?"
• Sales: "Increased monthly sales by 18%" instead of "Improved sales."
• Operations: "Managed a team of 6" / "Processed 200+ orders weekly."
• Cost: "Reduced supply costs by ZMW 4,000/month."
If you don't have exact figures, a reasonable estimate ("approx.", "around") is still far stronger than no number at all.`
    },
    {
      keywords: ["career gap", "gap in employment", "unemployed", "time off", "break from work", "took time off"],
      answer: `Gaps are common and rarely a dealbreaker if handled matter-of-factly:
• Be honest but brief — you don't need to justify every month.
• If you used the time productively (caregiving, studying, freelancing, volunteering, health), a single line covering it is enough — you can add it as its own short entry in Work Experience or a note in your summary.
• Don't leave a visibly empty date range with no explanation — that invites more questions than a one-line explanation would.
• Focus the rest of your CV on demonstrating you're ready and able to contribute now.`
    },
    {
      keywords: ["tailor", "customize", "customise", "specific job", "specific role", "adapt cv", "different job", "each application"],
      answer: (d) => `Tailoring beats a one-size-fits-all CV every time:
• Re-read the job posting and mirror its priority skills/keywords where true.
• Reorder your bullet points so the most relevant achievements for that role appear first.
• Adjust your summary's first line to match the exact job title where reasonable${d.targetRole ? ` (yours currently says "${d.targetRole}")` : ""}.
• Cut or shrink experience that's irrelevant to this particular application.
It takes 10-15 extra minutes per application but meaningfully improves your callback rate.`
    },
    {
      keywords: ["photo", "picture", "headshot", "image on cv", "profile photo"],
      answer: `Whether to include a photo depends on where you're applying:
• In many African, European and Asian markets a professional headshot is common and often expected.
• In the US, UK, Canada and Australia it's usually discouraged — employers there often avoid photos to reduce bias risk, and some ATS systems mishandle images.
If you do include one: a neutral background, good lighting, professional dress, and a friendly (not overly casual) expression. You can add one now using "Add profile photo" under Personal Information — it'll appear automatically in your chosen template.`
    },
    {
      keywords: ["file format", "pdf", "word doc", "docx", "export", "submit", "which format", "html"],
      answer: `PDF is the safest default — it preserves your formatting on any device and most ATS systems read it fine. Use the Print / PDF button and choose "Save as PDF" in the print dialog.
Only submit a Word doc if the employer specifically asks for one (some ATS tools actually prefer .docx). Our Export HTML button is handy for keeping an editable copy or hosting your CV online, but send PDF to employers unless told otherwise.`
    },
    {
      keywords: ["references", "referee", "reference list", "available on request"],
      answer: `"References available on request" is standard and fine — you don't need to list full contact details on the CV itself. Prepare a separate reference sheet with 2-3 people (former managers, lecturers, senior colleagues) who've agreed in advance to vouch for you, and send it only if asked.`
    },
    {
      keywords: ["cover letter", "need a cover letter"],
      answer: `A short, tailored cover letter still helps, especially for roles with many applicants — it's your chance to explain "why this company, why this role" in a way a CV can't. Keep it to 3-4 short paragraphs: why you're interested, your strongest relevant achievement, and a confident closing asking for an interview. Skip it only if the application explicitly says not to include one.`
    },
    {
      keywords: ["cover letter opening", "start a cover letter", "first line cover letter", "cover letter intro"],
      answer: `Skip "I am writing to apply for..." — hiring managers have read it a thousand times. Open with something specific instead: a genuine reason you're drawn to the company, or your strongest matching achievement. Example: "When I cut customer response times by 30% at my last role, I learned how much a well-run support team affects retention — which is exactly why [Company]'s customer-first reputation caught my attention."`
    },
    {
      keywords: ["hobbies", "interests", "personal interests"],
      answer: `Only include a Hobbies/Interests section if it adds something relevant — genuinely differentiating (e.g. you run a coding club) or directly related to the role. Generic entries like "reading, socialising" waste space. If you're short on experience, relevant interests can help show personality, but they should never push out important content.`
    },
    {
      keywords: ["cv vs resume", "difference between cv and resume", "resume or cv"],
      answer: `In most of the world (including Zambia, the UK, and Europe), "CV" is used for the general job-application document — that's exactly what this tool builds. In the US and Canada, "resume" is used for the same everyday document, while "CV" specifically means the longer academic/research document used for postgraduate, medical or academic positions. If applying to US-based roles for a standard job, what you build here works as your "resume."`
    },
    {
      keywords: ["present tense", "past tense", "current job", "current role", "tense for bullets"],
      answer: `Use present tense for your current role ("Manage a team of 5", "Lead weekly reporting") and past tense for previous roles ("Managed", "Led"). Keep tense consistent within each entry — mixing tenses in the same bullet list looks careless.`
    },
    {
      keywords: ["fired", "laid off", "let go", "terminated", "dismissed", "redundancy", "redundant"],
      answer: `You don't need to explain being let go on the CV itself — dates alone are enough there. If asked directly in an interview, keep it brief, factual and forward-looking: what happened (without blame), what you learned, and what you're looking for now. Avoid badmouthing a previous employer — it reflects on you, not them.`
    },
    {
      keywords: ["certification", "certificate", "list certifications"],
      answer: `List certifications with: name, issuing body, and year (e.g. "AWS Cloud Practitioner, Amazon Web Services, 2023"). Put the most relevant/recent ones first, and only include certifications that are current or still meaningfully relevant to the role — drop outdated ones that no longer add value.`
    },
    {
      keywords: ["template", "color", "colour", "which template", "design", "which design"],
      answer: `Pick based on industry and seniority:
• Modern Two-Column — great for tech, creative and marketing roles.
• Classic Single-Column — safest, universally accepted, good for conservative industries (finance, government, law).
• Executive — commanding dark header, best for senior/leadership roles.
• Minimal — clean and content-first, works almost everywhere.
For accent colour, blues and teals read as professional and trustworthy in most industries; save bold colours for creative fields. You can preview and switch anytime in the Templates tab.`
    },
    {
      keywords: ["font", "typeface", "which font"],
      answer: `Stick to clean, highly-legible fonts — the templates here already use professional pairings, so you generally don't need to change anything. If customising elsewhere, avoid decorative or handwriting fonts; simple sans-serif or serif fonts (like the ones built into these templates) print and scan best.`
    },
    {
      keywords: ["address", "home address", "full address", "postal address"],
      answer: `You don't need your full street address anymore — city and country (e.g. "Lusaka, Zambia") is enough for most applications and protects your privacy. Only give a full address if an employer specifically requests it for verification or relocation purposes.`
    },
    {
      keywords: ["job hopping", "many short jobs", "changed jobs a lot", "short stints", "frequent job changes"],
      answer: `If you've had several short roles, group similar short-term or contract work under one heading where honest (e.g. "Freelance Web Developer, various clients, 2021-2023") rather than listing each as a separate entry. For genuinely separate short roles, a brief one-line reason can help ("company downsized", "fixed-term contract") — but only if it fits naturally; don't over-explain.`
    },
    {
      keywords: ["volunteer", "volunteering", "unpaid work", "community work"],
      answer: `Volunteer work counts as real experience — list it like a job: role title, organisation, dates, and 1-2 bullet points on what you did and achieved. It's especially valuable if you're early-career, changing industries, or have a gap to fill productively.`
    },
    {
      keywords: ["email address", "professional email", "which email"],
      answer: `Use a simple, professional email based on your name (e.g. firstname.lastname@gmail.com). Avoid old nicknames, birth years, or anything unprofessional-sounding — recruiters do notice, and it takes two minutes to create a clean new address if needed.`
    },
    {
      keywords: ["follow up", "after applying", "follow-up email", "check on application"],
      answer: `A polite follow-up 1-2 weeks after applying (if you have a contact email) is generally well received. Keep it short: reaffirm your interest, mention one relevant strength, and ask if there's any update — no need to sound impatient. If there's a stated deadline or "we'll contact shortlisted candidates," it's fine to wait a bit longer before following up.`
    },
    {
      keywords: ["interview", "prepare for interview", "interview prep", "interview tips"],
      answer: `Once your CV lands an interview: re-read the job posting and your own CV together so every claim on it is fresh in your mind (interviewers often ask directly about bullet points). Prepare 2-3 STAR-format stories (Situation, Task, Action, Result) covering your best achievements, and have specific questions ready to ask them — it shows genuine interest.`
    },
    {
      keywords: ["mistake", "common mistakes", "what to avoid", "cv errors", "red flags"],
      answer: `Common CV mistakes to avoid:
• Spelling/grammar errors — always run Spell Check before sending.
• Vague statements with no evidence ("hard worker", "team player") and no numbers to back them up.
• Inconsistent formatting, tenses, or date formats.
• Irrelevant, outdated info (obsolete tech skills, jobs from 15+ years ago with no bearing on this role).
• Unprofessional email address or missing contact details.
• A CV that isn't tailored at all to the specific job.`
    },
    {
      keywords: ["dropped out", "didn't finish", "did not complete", "incomplete degree", "no degree"],
      answer: `List the qualification honestly with what you did complete — e.g. "Bachelor of Business Administration (2 years completed), University of Zambia" or simply the modules/skills gained. Don't claim a qualification you didn't finish, but there's no need to dwell on it either — focus the surrounding CV on skills and experience that make the case for you regardless.`
    },
    {
      keywords: ["gpa", "grades", "should i list my grades", "academic results"],
      answer: `Only include GPA/grades if they're strong and you're early in your career (student or recent graduate) — after your first job or two, employers care more about experience than college grades, so it's fine to drop them.`
    },
    {
      keywords: ["career change", "switching industries", "changing careers", "new field", "no experience in this field"],
      answer: `For a career change, lead with a summary that explicitly reframes your background around transferable skills relevant to the new field, rather than your old job title. Highlight overlapping skills (project management, client relations, analysis, etc.), any relevant courses/certifications you've taken, and consider a short "Relevant Skills" section near the top before diving into your (differently-titled) work history.`
    },
    {
      keywords: ["freelance", "self employed", "self-employed", "own business", "entrepreneur"],
      answer: `List freelance/self-employed work like a normal role: "Freelance [Your Skill], Self-Employed, [dates]" with bullet points on client work, projects delivered, and results (client count, revenue, ratings). It demonstrates initiative and real-world skill just as much as traditional employment — don't undersell it.`
    },
    {
      keywords: ["stand out", "make my cv better", "improve my cv", "get noticed"],
      answer: `To make a CV stand out for the right reasons: tailor it to each role, lead every bullet with an action verb and a number, keep the design clean and easy to scan (which our templates handle for you), and make sure your summary earns a second glance in the first 3 sentences — recruiters often skim a CV in under 10 seconds before deciding whether to read on.`
    },
    {
      keywords: ["keyword", "keywords for", "what keywords"],
      answer: (d) => d.targetRole
        ? `For a ${d.targetRole} role, pull your keywords straight from job postings for that title — look at 3-5 postings and note which skills, tools and phrases repeat. Use those exact terms in your Skills and Experience sections wherever they're honestly true of you. This helps both with ATS scanning and with a human reader recognising you're a fit at a glance.`
        : `Add your Target Role field first and I can tailor this — in general, pull keywords straight from 3-5 real job postings for the role you want, noting which skills and tools repeat, then use those exact terms in your Skills and Experience sections wherever honestly true.`
    },
    {
      keywords: ["promotion", "promoted", "same company", "internal move", "multiple roles same company"],
      answer: `Show promotions within one company clearly — list the company once, then stack each role/title with its own date range and bullet points underneath, most recent on top. This visually demonstrates growth and is viewed very positively by employers.`
    },
    {
      keywords: ["structure", "order of sections", "what order", "layout of cv", "sections order"],
      answer: `A solid default order: Contact Info → Summary → Skills → Work Experience → Education → Certifications/Projects → Additional Info (languages, availability). If you're a recent graduate with limited work history, move Education above Work Experience. Our Builder is already set up in a sensible default order — feel free to reorder details within each section for emphasis.`
    },
    {
      keywords: ["language", "languages spoken", "language proficiency", "list languages"],
      answer: `List languages with a rough proficiency level, e.g. "English (Fluent), Bemba (Native), French (Conversational)." Only list languages relevant to your work or the region you're applying in — you don't need to list every language you know a handful of words in.`
    },
    {
      keywords: ["ai generated", "using ai", "is this cheating", "is it okay to use a template", "template okay"],
      answer: `Using a well-structured template and AI-assisted wording is completely normal and widely done — recruiters expect a clean, professional format, not hand-crafted prose. What matters is that the content is accurate and genuinely yours: your real experience, skills, and achievements. Use AI Enhance to sharpen your wording, but always review the result to make sure it still sounds like you and stays truthful.`
    },
  ];

  const GENERIC_FALLBACKS = [
    "I don't have a ready answer for that specific phrasing, but I can help with CV summaries, tailoring your CV to a role, ATS-friendly formatting, quantifying achievements, career gaps, cover letters and more — try rephrasing, or tap one of the suggestion chips above.",
    "I'm not quite sure I followed that one. I'm best at CV and job-application questions — things like \"how do I explain a career gap\" or \"how long should my CV be.\" Want to try asking one of those, or rephrase your question?",
  ];

  function scoreEntry(msgLower, entry) {
    let score = 0;
    entry.keywords.forEach(k => {
      if (msgLower.includes(k)) score += k.split(" ").length; // longer/more specific phrases score higher
    });
    return score;
  }

  function buildLocalAnswer(userMessage, formData) {
    const msgLower = (userMessage || "").toLowerCase();
    let best = null, bestScore = 0;
    KB.forEach(entry => {
      const s = scoreEntry(msgLower, entry);
      if (s > bestScore) { bestScore = s; best = entry; }
    });
    if (best) {
      return typeof best.answer === "function" ? best.answer(formData || {}) : best.answer;
    }
    return GENERIC_FALLBACKS[Math.floor(Math.random() * GENERIC_FALLBACKS.length)];
  }

  /* ── LOCAL RULE-BASED TEXT ENHANCEMENT ──────────────────── */
  const WEAK_OPENERS = [
    [/^responsible for\s+/i, ""],
    [/^duties included\s+/i, ""],
    [/^in charge of\s+/i, ""],
    [/^helped (?:with|to)\s+/i, "Supported "],
    [/^worked on\s+/i, "Delivered "],
    [/^did\s+/i, "Completed "],
    [/^was involved in\s+/i, "Contributed to "],
  ];
  const VERB_MAP = {
    "made": "Built", "did": "Completed", "helped": "Supported", "got": "Achieved",
    "worked on": "Delivered", "handled": "Managed", "in charge of": "Led",
    "took care of": "Managed", "looked after": "Oversaw", "dealt with": "Resolved",
  };

  function toTitleStart(s) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /** Cheap, dependency-free rewrite: strengthens weak openers, fixes
   *  capitalisation, trims filler, and nudges toward action-verb bullets.
   *  Not as good as a real LLM, but always available and always useful. */
  function localEnhance(text) {
    if (!text) return text;
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const improved = lines.map(line => {
      let s = line;
      WEAK_OPENERS.forEach(([re, replacement]) => { s = s.replace(re, replacement); });
      Object.keys(VERB_MAP).forEach(weak => {
        const re = new RegExp("\\b" + weak + "\\b", "i");
        if (re.test(s.split(" ").slice(0, 3).join(" "))) {
          s = s.replace(re, VERB_MAP[weak]);
        }
      });
      s = s.replace(/\s+/g, " ").trim();
      s = toTitleStart(s);
      if (s && !/[.!?]$/.test(s) && s.split(" ").length > 6) {
        // leave shorter bullet fragments without a period (common CV style)
      }
      return s;
    });
    return improved.join("\n");
  }

  /* ── LOCAL SPELL CHECK FALLBACK ──────────────────────────── */
  const COMMON_MISSPELLINGS = {
    "acheive": "achieve", "acheived": "achieved", "accross": "across",
    "adress": "address", "arguement": "argument", "beleive": "believe",
    "buisness": "business", "calender": "calendar", "collegue": "colleague",
    "comitted": "committed", "commited": "committed", "comittee": "committee",
    "concious": "conscious", "definately": "definitely", "dissapoint": "disappoint",
    "embarass": "embarrass", "enviroment": "environment", "excelent": "excellent",
    "existance": "existence", "experiance": "experience", "familar": "familiar",
    "fourty": "forty", "goverment": "government", "grammer": "grammar",
    "harrass": "harass", "immediatly": "immediately", "independant": "independent",
    "intergrate": "integrate", "knowlege": "knowledge", "lenght": "length",
    "liason": "liaison", "libary": "library", "maintainance": "maintenance",
    "managment": "management", "mispell": "misspell", "neccessary": "necessary",
    "noticable": "noticeable", "occassion": "occasion", "occured": "occurred",
    "occurence": "occurrence", "persistant": "persistent", "posession": "possession",
    "prefered": "preferred", "priviledge": "privilege", "proffesional": "professional",
    "publically": "publicly", "recieve": "receive", "recieved": "received",
    "recomend": "recommend", "refered": "referred", "relevent": "relevant",
    "responsibilty": "responsibility", "seperate": "separate", "seperated": "separated",
    "similiar": "similar", "succesful": "successful", "sucessful": "successful",
    "succeded": "succeeded", "supervisior": "supervisor", "thier": "their",
    "tommorow": "tomorrow", "truely": "truly", "untill": "until",
    "wich": "which", "writen": "written", "acknowlege": "acknowledge",
    "cheif": "chief", "definate": "definite", "developement": "development",
    "enviroment": "environment", "excellant": "excellent", "freind": "friend",
    "guage": "gauge", "hight": "height", "opperation": "operation",
    "orginize": "organize", "orginise": "organise", "recieveing": "receiving",
  };

  function localSpellCheck(text) {
    const issues = [];
    const words = text.match(/[A-Za-z']+/g) || [];
    const seen = new Set();
    words.forEach(w => {
      const lower = w.toLowerCase();
      if (COMMON_MISSPELLINGS[lower] && !seen.has(lower)) {
        seen.add(lower);
        issues.push({ bad: w, suggestions: [COMMON_MISSPELLINGS[lower]] });
      }
    });
    return issues;
  }

  /* ── PUBLIC / EXTERNAL SERVICE ATTEMPTS (best-effort) ────── */

  /** Quick, silent connectivity probe. Never throws. */
  async function pingProvider() {
    try {
      await fetchWithTimeout("https://api.languagetool.org/v2/languages", {}, 3000);
      return true;
    } catch {
      return false;
    }
  }

  /** Free public grammar/spell API (LanguageTool). Falls back to the
   *  local dictionary checker on any failure. */
  async function checkSpelling(text) {
    try {
      const res = await fetchWithTimeout("https://api.languagetool.org/v2/check", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "text=" + encodeURIComponent(text) + "&language=en-US",
      }, 8000);
      if (!res.ok) throw new Error("bad response");
      const data = await res.json();
      const issues = (data.matches || [])
        .filter(m => m.rule && (m.rule.issueType === "misspelling" || (m.rule.category && m.rule.category.id === "TYPOS")))
        .map(m => ({
          bad: text.substring(m.offset, m.offset + m.length),
          suggestions: (m.replacements || []).slice(0, 3).map(r => r.value),
        }))
        .filter(i => i.suggestions.length > 0);
      // merge in anything the local dictionary catches that LT might have missed
      const local = localSpellCheck(text);
      const merged = issues.slice();
      local.forEach(li => {
        if (!merged.some(m => m.bad.toLowerCase() === li.bad.toLowerCase())) merged.push(li);
      });
      return merged;
    } catch {
      return localSpellCheck(text);
    }
  }

  /** Best-effort external text generation with a strict timeout; always
   *  resolves (never rejects) so the caller never has to show an error. */
  async function tryExternalGenerate(prompt, timeoutMs) {
    try {
      const res = await fetchWithTimeout(
        "https://text.pollinations.ai/" + encodeURIComponent(prompt),
        { method: "GET" },
        timeoutMs || 7000
      );
      if (!res.ok) throw new Error("bad response");
      const out = (await res.text() || "").trim();
      if (!out || out.length < 2) throw new Error("empty response");
      return out;
    } catch {
      return null;
    }
  }

  /** Chat replies for the AI panel. Tries a free external service first
   *  for a more natural answer, then always falls back to the local
   *  knowledge base so the assistant remains useful offline. */
  async function getChatReply(userMessage, formData) {
    const rolePart = formData && formData.targetRole ? ` The user is building a CV for a "${formData.targetRole}" role.` : "";
    const prompt = `You are a concise, encouraging CV and job-application writing assistant embedded in a CV builder tool.${rolePart} Answer the user's question in under 120 words, using practical, specific advice. Question: ${userMessage}`;
    const external = await tryExternalGenerate(prompt, 7000);
    if (external) return cleanText(external);
    return buildLocalAnswer(userMessage, formData);
  }

  /** Rewrites/improves a block of CV text. Tries the external service
   *  first, and if it fails, applies the local rule-based enhancer so
   *  the button still does something useful rather than erroring out. */
  async function enhanceText(originalText, context, targetRole) {
    const prompt = `Rewrite the following ${context || "CV text"} for a ${targetRole || "professional"} role to sound more professional, concise and achievement-focused. Use strong action verbs and keep roughly the same length. Only return the rewritten text, no preamble or explanation.\n\nOriginal:\n${originalText}`;
    const external = await tryExternalGenerate(prompt, 8000);
    if (external) return cleanText(external);
    return localEnhance(originalText);
  }

  /* ── EXPORT ──────────────────────────────────────────────── */
  window.AnicadeAI = {
    SUGGESTED_QUESTIONS,
    pingProvider,
    getChatReply,
    enhanceText,
    localEnhance,
    checkSpelling,
  };

})();

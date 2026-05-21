const form = document.querySelector("#cv-form");
const preview = document.querySelector("#cv-preview");
const title = document.querySelector("#preview-title");
const completionLabel = document.querySelector("#completion-label");
const completionBar = document.querySelector("#completion-bar");
const experienceList = document.querySelector("#experience-list");
const educationList = document.querySelector("#education-list");

const sampleData = {
  fullName: "Tresfor Zulu",
  targetRole: "Operations Coordinator",
  email: "tresfor@example.com",
  phone: "+260 777 083 995",
  location: "Kabwe, Zambia",
  portfolio: "https://linkedin.com/in/username",
  summary: "Detail-oriented operations professional with 5+ years of experience coordinating teams, improving administrative systems and supporting customer-facing projects. Known for strong communication, accurate reporting and reliable delivery in fast-paced environments.",
  skills: "Operations coordination, Team supervision, Customer service, Microsoft Excel, Report writing, Procurement support, Scheduling, Problem solving, Communication, Data entry",
  projects: "Branch filing system upgrade - redesigned paper and digital records, reducing document retrieval time by 40%.\nCustomer feedback dashboard - consolidated weekly service issues and helped managers prioritize improvements.",
  certifications: "Project Management Fundamentals, Alison, 2024\nAdvanced Excel for Business, Coursera, 2023",
  awards: "Recognized for outstanding customer support, 2023\nExceeded monthly reporting accuracy target for six consecutive months",
  languages: "English, Bemba, Nyanja, Chinese, Japanese",
  availability: "Immediately",
  references: "Available on request",
  cvFont: "Inter",
  accent: "#0f766e",
  template: "modern",
  experience: [
    {
      role: "Operations Coordinator",
      company: "Anicade Client Services",
      dates: "Mar 2022 - Present",
      place: "Kabwe, Zambia",
      details: "Coordinate daily office operations for a team of 12 staff\nPrepare weekly performance reports and management summaries\nImproved stock tracking accuracy by introducing a shared register\nSupport customer escalations and follow up until resolution"
    },
    {
      role: "Administrative Assistant",
      company: "Central Business Solutions",
      dates: "Jan 2019 - Feb 2022",
      place: "Lusaka, Zambia",
      details: "Managed calls, appointments and client records\nProcessed invoices and maintained supplier documentation\nOrganized staff travel, meeting rooms and office supplies\nTrained two junior assistants on filing and front-desk procedures"
    }
  ],
  education: [
    {
      qualification: "Diploma in Business Administration",
      institution: "Evelyn Hone College",
      dates: "2016 - 2018",
      place: "Lusaka, Zambia",
      notes: "Relevant coursework: operations management, accounting, business communication"
    }
  ]
};

const placeholders = {
  fullName: "Your Name",
  targetRole: "Target Job Title",
  summary: "Add a short professional summary that explains your experience, core strengths and career direction.",
  references: "Available on request"
};

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function lines(value) {
  return String(value || "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function paragraphLines(value) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getFormData() {
  const data = Object.fromEntries(new FormData(form).entries());
  data.experience = [...experienceList.querySelectorAll(".repeat-item")].map(readRepeatItem);
  data.education = [...educationList.querySelectorAll(".repeat-item")].map(readRepeatItem);
  return data;
}

function readRepeatItem(item) {
  return [...item.querySelectorAll("[data-field]")].reduce((entry, field) => {
    entry[field.dataset.field] = field.value.trim();
    return entry;
  }, {});
}

function contactItems(data) {
  return [
    data.email,
    data.phone,
    data.location,
    data.portfolio
  ].filter(Boolean);
}

function renderList(items, className = "cv-list") {
  if (!items.length) return "<p>Information to be added.</p>";
  return `<ul class="${className}">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderExperience(items) {
  const valid = items.filter((item) => item.role || item.company || item.details);
  if (!valid.length) return "<p>Add work history to show employers where you have created value.</p>";

  return valid.map((item) => `
    <div class="cv-item">
      <h4>${escapeHtml(item.role || "Job Title")}</h4>
      <div class="cv-meta">${escapeHtml([item.company, item.place, item.dates].filter(Boolean).join(" | "))}</div>
      ${renderList(paragraphLines(item.details))}
    </div>
  `).join("");
}

function renderEducation(items) {
  const valid = items.filter((item) => item.qualification || item.institution || item.notes);
  if (!valid.length) return "<p>Add your education, training or qualifications.</p>";

  return valid.map((item) => `
    <div class="cv-item">
      <h4>${escapeHtml(item.qualification || "Qualification")}</h4>
      <div class="cv-meta">${escapeHtml([item.institution, item.place, item.dates].filter(Boolean).join(" | "))}</div>
      ${paragraphLines(item.notes).map((note) => `<p>${escapeHtml(note)}</p>`).join("")}
    </div>
  `).join("");
}

function renderTextSection(value) {
  const items = paragraphLines(value);
  if (!items.length) return "<p>Information to be added.</p>";
  return items.map((item) => `<p>${escapeHtml(item)}</p>`).join("");
}

function renderCv() {
  const data = getFormData();
  const name = data.fullName || placeholders.fullName;
  const role = data.targetRole || placeholders.targetRole;
  const summary = data.summary || placeholders.summary;
  const cvClass = data.template === "classic" ? "cv-classic" : "cv-modern";

  preview.className = `cv-document ${cvClass}`;
  preview.style.setProperty("--cv-font", `"${data.cvFont || "Inter"}"`);
  preview.style.setProperty("--cv-accent", data.accent || "#0f766e");
  title.textContent = data.fullName ? `${data.fullName}'s CV preview` : "Your CV is taking shape";

  preview.innerHTML = `
    <section class="cv-page">
      <aside class="cv-sidebar">
        <h2 class="cv-name">${escapeHtml(name)}</h2>
        <p class="cv-role">${escapeHtml(role)}</p>
        <div class="cv-section">
          <h3>Contact</h3>
          ${renderList(contactItems(data), "cv-list cv-contact-list")}
        </div>
        <div class="cv-section">
          <h3>Core Skills</h3>
          ${renderList(lines(data.skills), "cv-list cv-skill-list")}
        </div>
        <div class="cv-section">
          <h3>Languages</h3>
          ${renderList(lines(data.languages))}
        </div>
        <div class="cv-section">
          <h3>Availability</h3>
          <p>${escapeHtml(data.availability || "To be discussed")}</p>
        </div>
      </aside>
      <main class="cv-main">
        <div class="cv-section">
          <h3>Professional Profile</h3>
          <p>${escapeHtml(summary)}</p>
        </div>
        <div class="cv-section">
          <h3>Work Experience</h3>
          ${renderExperience(data.experience)}
        </div>
        <div class="cv-section">
          <h3>Education</h3>
          ${renderEducation(data.education)}
        </div>
      </main>
    </section>
    <section class="cv-page">
      <aside class="cv-sidebar">
        <h2 class="cv-name">${escapeHtml(name)}</h2>
        <p class="cv-role">${escapeHtml(role)}</p>
        <div class="cv-section">
          <h3>References</h3>
          <p>${escapeHtml(data.references || placeholders.references)}</p>
        </div>
        <p class="cv-footer-note">Generated with Anicade CV Generator. Company site: www.anicadetech.xyz</p>
      </aside>
      <main class="cv-main">
        <div class="cv-section">
          <h3>Selected Projects</h3>
          ${renderTextSection(data.projects)}
        </div>
        <div class="cv-section">
          <h3>Certifications</h3>
          ${renderTextSection(data.certifications)}
        </div>
        <div class="cv-section">
          <h3>Awards & Achievements</h3>
          ${renderTextSection(data.awards)}
        </div>
        <div class="cv-section">
          <h3>Application Notes</h3>
          <p>This CV includes the core information usually expected in a job application: contact details, career summary, skills, work experience, education, projects, certifications, achievements, languages, availability and references.</p>
        </div>
      </main>
    </section>
  `;

  updateCompletion(data);
}

function updateCompletion(data) {
  const fields = [
    "fullName",
    "targetRole",
    "email",
    "phone",
    "summary",
    "skills",
    "languages",
    "availability",
    "references"
  ];
  const filledFields = fields.filter((field) => String(data[field] || "").trim()).length;
  const hasExperience = data.experience.some((item) => item.role && item.company && item.details);
  const hasEducation = data.education.some((item) => item.qualification && item.institution);
  const score = Math.round(((filledFields + Number(hasExperience) + Number(hasEducation)) / (fields.length + 2)) * 100);
  completionLabel.textContent = `${score}%`;
  completionBar.style.width = `${score}%`;
}

function addRepeat(kind, values = {}) {
  const template = document.querySelector(`#${kind}-template`);
  const node = template.content.firstElementChild.cloneNode(true);
  node.querySelectorAll("[data-field]").forEach((field) => {
    field.value = values[field.dataset.field] || "";
    field.addEventListener("input", renderCv);
  });
  node.querySelector(".remove-button").addEventListener("click", () => {
    node.remove();
    renderCv();
  });
  document.querySelector(`#${kind}-list`).append(node);
  renderCv();
}

function fillSample() {
  Object.entries(sampleData).forEach(([key, value]) => {
    const field = form.elements[key];
    if (field && typeof value === "string") field.value = value;
  });
  experienceList.innerHTML = "";
  educationList.innerHTML = "";
  sampleData.experience.forEach((item) => addRepeat("experience", item));
  sampleData.education.forEach((item) => addRepeat("education", item));
  renderCv();
}

function clearForm() {
  form.reset();
  experienceList.innerHTML = "";
  educationList.innerHTML = "";
  addRepeat("experience");
  addRepeat("education");
  renderCv();
}

document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab-button").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`#${button.dataset.tab}-panel`).classList.add("active");
  });
});

document.querySelectorAll("[data-add]").forEach((button) => {
  button.addEventListener("click", () => addRepeat(button.dataset.add));
});

form.addEventListener("input", renderCv);
form.addEventListener("change", renderCv);
document.querySelector("#sample-button").addEventListener("click", fillSample);
document.querySelector("#clear-button").addEventListener("click", clearForm);
document.querySelector("#print-button").addEventListener("click", () => window.print());

addRepeat("experience");
addRepeat("education");
renderCv();

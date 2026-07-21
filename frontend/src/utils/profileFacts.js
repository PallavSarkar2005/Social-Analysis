const PLACEHOLDER_PATTERN = /^(n\/a|na|unknown|—|-|–|\.+|not available|none|null|undefined|tbd|pending)$/i;

export const safeArray = (value) => (Array.isArray(value) ? value : []);

export const isVerifiedValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (PLACEHOLDER_PATTERN.test(trimmed)) return false;
    return true;
  }
  if (Array.isArray(value)) return value.some((entry) => isVerifiedValue(entry));
  // Plain objects (e.g. evidence {type,label,detail,source}) are NOT displayable scalars.
  // Treating them as verified caused React "Objects are not valid as a React child" crashes.
  return false;
};

export const extractYear = (text) => {
  if (!isVerifiedValue(text)) return null;
  const match = String(text).match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : null;
};

export const parseBirthPlace = (dob) => {
  if (!isVerifiedValue(dob)) return null;
  const text = String(dob);
  const commaParts = text.split(",").map((part) => part.trim()).filter(Boolean);
  if (commaParts.length < 2) return null;
  const place = commaParts.slice(1).join(", ");
  return isVerifiedValue(place) ? place : null;
};

const SCHOOL_PATTERN = /\b(school|ssc|matric|matriculation|secondary|high school|10th|12th|intermediate|h\.?s\.?c|s\.?s\.?c)\b/i;
const COLLEGE_PATTERN = /\b(university|college|iit|iim|mba|ph\.?d|b\.?a\.?|b\.?s\.?c|m\.?a\.?|m\.?s\.?c|degree|alma mater|graduate|b\.?tech|m\.?tech|llb|llm|md|b\.?com|m\.?com)\b/i;

export const splitEducation = (education) => {
  if (!isVerifiedValue(education)) return { school: null, college: null, full: null };

  const text = String(education).trim();
  const segments = text.split(/[;|•\n]+/).map((segment) => segment.trim()).filter(Boolean);

  let school = null;
  let college = null;

  for (const segment of segments) {
    if (!school && SCHOOL_PATTERN.test(segment)) school = segment;
    if (!college && COLLEGE_PATTERN.test(segment)) college = segment;
  }

  if (!school && SCHOOL_PATTERN.test(text)) school = text;
  if (!college && COLLEGE_PATTERN.test(text)) college = text;

  if (!school && !college) {
    if (segments.length > 1) {
      return { school: segments[0], college: segments.slice(1).join("; "), full: text };
    }
    return { school: null, college: text, full: text };
  }

  return { school, college, full: text };
};

/**
 * Build verified profile facts for the intelligence card — only fields with real data.
 */
export const buildVerifiedProfileFacts = ({ biography = {}, account = {} }) => {
  const birthPlace = parseBirthPlace(biography.dob);
  const educationParts = splitEducation(biography.education);

  const candidates = [
    {
      key: "fullName",
      label: "Full Name",
      value: biography.fullName || account.name,
    },
    {
      key: "dob",
      label: "Date of Birth",
      value: biography.dob,
    },
    {
      key: "age",
      label: "Age",
      value: biography.age ? `${biography.age} years` : null,
    },
    {
      key: "birthPlace",
      label: "Birth Place",
      value: birthPlace,
    },
    {
      key: "constituency",
      label: "Constituency",
      value: biography.constituency,
    },
    {
      key: "currentOffice",
      label: "Current Office",
      value: biography.currentOffice || biography.currentPosition,
    },
    {
      key: "education",
      label: "Education",
      value: educationParts.full || biography.education,
    },
    {
      key: "profession",
      label: "Profession",
      value: biography.profession,
    },
    {
      key: "priorCareer",
      label: "Prior Career",
      value:
        biography.profession && biography.priorCareer && biography.priorCareer !== biography.profession
          ? biography.priorCareer
          : null,
    },
    {
      key: "party",
      label: "Political Party",
      value: biography.party || account.party,
    },
    {
      key: "joinedParty",
      label: "Joined Party",
      value: biography.dateJoinedParty,
    },
  ];

  return candidates.filter((field) => isVerifiedValue(field.value));
};

/**
 * Canonical fact types emitted by all political profile providers.
 */
export const FACT_TYPES = [
  "Birth",
  "Birth Place",
  "School Education",
  "College Education",
  "Degree",
  "Profession",
  "Political Party",
  "Party Join",
  "Election",
  "Appointment",
  "Cabinet Position",
  "Government Position",
  "Committee",
  "Award",
  "Court Case",
  "Controversy",
  "Speech",
  "Resignation",
  "Social Milestone",
  "Parliament Membership",
  "Assembly Membership",
  "Current Office",
];

export const FACT_TYPE_TO_TIMELINE_CATEGORY = {
  Birth: "birth",
  "Birth Place": "birth",
  "School Education": "school",
  "College Education": "college",
  Degree: "college",
  Profession: "earlyCareer",
  "Political Party": "joinedParty",
  "Party Join": "joinedParty",
  Election: "election",
  Appointment: "position",
  "Cabinet Position": "cabinetCommittee",
  "Government Position": "position",
  Committee: "cabinetCommittee",
  Award: "position",
  "Parliament Membership": "position",
  "Assembly Membership": "position",
  "Current Office": "currentOffice",
  Resignation: "position",
};

export const TIMELINE_CATEGORY_ORDER = {
  birth: 1,
  school: 2,
  college: 3,
  earlyCareer: 4,
  joinedParty: 5,
  election: 6,
  position: 7,
  cabinetCommittee: 8,
  currentOffice: 9,
};

export const SOURCE_PRIORITY_WEIGHT = {
  lokSabha: 100,
  rajyaSabha: 95,
  stateAssembly: 90,
  eciAffidavit: 88,
  wikipedia: 70,
  partyWebsite: 65,
};

export const SOURCE_DISPLAY_NAMES = {
  lokSabha: "Lok Sabha",
  rajyaSabha: "Rajya Sabha",
  stateAssembly: "State Assembly",
  eciAffidavit: "Election Commission / MyNeta",
  wikipedia: "Wikipedia",
  partyWebsite: "Official Party Website",
};

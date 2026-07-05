import { isVerifiedValue } from "./politicalFactEngine.js";

const nodeId = (type, label) => `${type}:${String(label).toLowerCase().replace(/\s+/g, "_").slice(0, 60)}`;

/**
 * Build relationship graph nodes and edges from verified facts and biography.
 */
export const buildRelationshipGraph = ({ biography = {}, facts = [], elections = [] }) => {
  const safeFacts = Array.isArray(facts) ? facts : [];
  const safeElections = Array.isArray(elections) ? elections : [];
  const nodes = [];
  const edges = [];
  const nodeSet = new Set();

  const addNode = (type, label, meta = {}) => {
    const id = nodeId(type, label);
    if (nodeSet.has(id) || !isVerifiedValue(label)) return id;
    nodeSet.add(id);
    nodes.push({ id, type, label, ...meta });
    return id;
  };

  const addEdge = (fromId, toId, relation) => {
    if (!fromId || !toId || fromId === toId) return;
    edges.push({ from: fromId, to: toId, relation });
  };

  const politicianId = addNode("Politician", biography.fullName || "Unknown");
  if (!politicianId) return { nodes: [], edges: [] };

  if (isVerifiedValue(biography.party)) {
    const partyId = addNode("Political Party", biography.party);
    addEdge(politicianId, partyId, "member_of");
  }

  if (isVerifiedValue(biography.state)) {
    const stateId = addNode("State", biography.state);
    addEdge(politicianId, stateId, "based_in");
  }

  if (isVerifiedValue(biography.constituency)) {
    const constId = addNode("Constituency", biography.constituency);
    addEdge(politicianId, constId, "represents");
  }

  if (isVerifiedValue(biography.currentOffice) || isVerifiedValue(biography.currentPosition)) {
    const officeId = addNode(
      "Government",
      biography.currentOffice || biography.currentPosition
    );
    addEdge(politicianId, officeId, "holds_office");
  }

  for (const fact of safeFacts) {
    if (fact.type === "Cabinet Position" && isVerifiedValue(fact.value)) {
      const cabId = addNode("Cabinet", fact.value);
      addEdge(politicianId, cabId, "cabinet_role");
    }
    if (fact.type === "Committee" && isVerifiedValue(fact.value)) {
      const comId = addNode("Committee", fact.value);
      addEdge(politicianId, comId, "committee_member");
    }
  }

  for (const row of safeElections) {
    if (!isVerifiedValue(row.constituency)) continue;
    const electionId = addNode("Election", `${row.election || "Election"} ${row.year || ""}`.trim());
    const constId = addNode("Constituency", row.constituency);
    addEdge(politicianId, electionId, "contested");
    addEdge(electionId, constId, "in_constituency");

    if (isVerifiedValue(row.opponent)) {
      const oppId = addNode("Related Leader", row.opponent);
      addEdge(oppId, electionId, "opponent_in");
      addEdge(politicianId, oppId, "election_opponent");
    }
  }

  return { nodes, edges };
};

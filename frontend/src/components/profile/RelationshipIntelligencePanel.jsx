import React from "react";
import { Network } from "lucide-react";

const TYPE_COLORS = {
  Politician: "text-indigo-400",
  "Political Party": "text-violet-400",
  Constituency: "text-emerald-400",
  Government: "text-amber-400",
  Cabinet: "text-orange-400",
  Committee: "text-cyan-400",
  "Related Leader": "text-rose-400",
  Election: "text-sky-400",
  State: "text-slate-400",
};

import { safeArray } from "../../utils/profileFacts";

export default function RelationshipIntelligencePanel({ relationships = {}, sectionMeta = {} }) {
  const safeNodes = safeArray(relationships?.nodes);
  const safeEdges = safeArray(relationships?.edges);

  if (!safeNodes.length) return null;

  const meta = sectionMeta?.relationships || {};

  const edgesByNode = safeEdges.reduce((acc, edge) => {
    if (!acc[edge.from]) acc[edge.from] = [];
    acc[edge.from].push(edge);
    return acc;
  }, {});

  const root = safeNodes.find((n) => n.type === "Politician") || safeNodes[0];

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#121318]/40 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-indigo-400" />
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Relationship Intelligence
          </h4>
        </div>
        {meta.lastVerified && (
          <span className="text-[10px] text-slate-500">
            {meta.sourceCount || 0} sources · {meta.confidence || 0}% confidence
          </span>
        )}
      </div>

      <div className="space-y-2">
        {safeNodes.map((node) => {
          const nodeEdges = edgesByNode[node.id] || [];
          const color = TYPE_COLORS[node.type] || "text-slate-300";
          return (
            <div
              key={node.id}
              className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-bold uppercase tracking-wider ${color}`}>
                  {node.type}
                </span>
                <span className="text-xs font-semibold text-white">{node.label}</span>
              </div>
              {nodeEdges.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {nodeEdges.map((edge, idx) => {
                    const target = safeNodes.find((n) => n.id === edge.to);
                    return (
                      <span
                        key={idx}
                        className="rounded bg-white/[0.04] px-2 py-0.5 text-[9px] text-slate-500"
                      >
                        {edge.relation.replace(/_/g, " ")}
                        {target ? ` → ${target.label}` : ""}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {root && (
        <p className="mt-3 text-[10px] text-slate-600">
          Graph ready for visualization — {safeNodes.length} nodes, {safeEdges.length} edges
        </p>
      )}
    </div>
  );
}

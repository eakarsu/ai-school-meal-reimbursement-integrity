import test from "node:test"; import assert from "node:assert/strict";
delete process.env.OPENROUTER_API_KEY; delete process.env.OPENAI_API_KEY; delete process.env.ANTHROPIC_API_KEY;
const {filterRecords,recordsToCsv,buildInsights,displayValue}=await import("../featurePack.mjs");
const rows=[{id:1,reference:"M-1",subject:"Lunch claim",state:"intake",owner:"Sam",risk:"High",due_date:"2026-01-01",amount:0},{id:2,reference:"M-2",subject:"Breakfast",state:"closed",owner:"Jo",risk:"Low",due_date:"2026-02-01",amount:50}];
test("search/filter",()=>{ assert.equal(filterRecords(rows,{q:"lunch"}).length,1); assert.equal(filterRecords(rows,{status:"closed"}).length,1); });
test("export csv",()=>{ assert.ok(recordsToCsv(rows).includes("M-1")); });
test("insights fallback preserves 0/false",()=>{ const o=buildInsights(rows); assert.equal(o.aiGenerated,false); assert.equal(o.insights.length,3); assert.equal(displayValue(0),"0"); assert.equal(displayValue(false),"false"); assert.equal(buildInsights([]).insights[0].sections.find(s=>s.label==="Total value").value,0); });

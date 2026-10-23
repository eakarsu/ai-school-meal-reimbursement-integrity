// Feature pack: search/filter, CSV/JSON export, deterministic insights over workflow_cases. No provider calls.
export function displayValue(v){ if(v===false) return "false"; if(v===0) return "0"; if(v===""||v==null) return "(empty)"; return String(v); }
export function filterRecords(rows,{q="",status="",risk="",workflow=""}={}){
  const needle=String(q).trim().toLowerCase();
  return (rows||[]).filter(r=>{
    if(workflow && String(r.workflow_id||"")!==workflow) return false;
    if(status && String(r.state||r.status||"")!==status) return false;
    if(risk && String(r.risk||"")!==risk) return false;
    if(!needle) return true;
    return [r.reference,r.subject,r.state,r.status,r.owner,r.risk,r.due_date,JSON.stringify(r.payload||{})].join(" ").toLowerCase().includes(needle);
  });
}
function csvCell(v){ const s=v==null?"":String(v); return /[",\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s; }
export function recordsToCsv(rows){ const cols=["id","reference","subject","state","owner","risk","due_date","amount"]; const lines=[cols.join(",")]; for(const r of rows||[]) lines.push(cols.map(c=>csvCell(r[c]??(c==="state"?r.status:""))).join(",")); return lines.join("\n")+"\n"; }
export function buildInsights(rows){
  const list=rows||[]; const total=list.reduce((s,r)=>s+(Number(r.amount)||0),0);
  const high=list.filter(r=>["High","Critical"].includes(r.risk)); const open=list.filter(r=>!["closed","approved"].includes(String(r.state||r.status||"").toLowerCase()));
  const top=[...list].sort((a,b)=>(Number(b.amount)||0)-(Number(a.amount)||0))[0]||null;
  const mk=(id,title,summary,sections)=>({id,title,summary,aiGenerated:false,source:"deterministic-fallback",sections});
  return {aiGenerated:false,source:"deterministic-fallback",insights:[
    mk("meal-value","Meal reimbursement — value concentration", top?`Largest case ${top.reference} is ${total?Math.round((Number(top.amount)||0)/total*100):0}% of represented value.`:"No cases yet.",[{label:"Record count",value:list.length},{label:"Total value",value:total},{label:"Largest record",value:top?top.reference:"(empty)"},{label:"Has records",value:list.length>0}]),
    mk("meal-risk","Meal reimbursement — integrity risk triage", `${high.length} high/critical case(s) need review.`,[{label:"High or critical count",value:high.length},{label:"Open count",value:open.length},{label:"Has high risk",value:high.length>0},{label:"First high-risk reference",value:high[0]?.reference??""}]),
    mk("meal-queue","Meal reimbursement — next-action queue", `${open.length} case(s) still open.`,[{label:"Open count",value:open.length},{label:"Oldest due date",value:[...open].sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date)))[0]?.due_date??""},{label:"All closed",value:open.length===0}]),
  ]};
}
export function mountFeaturePack(app,{pool}){
  app.get("/api/records/export", async(req,res)=>{
    const rows=(await pool.query("SELECT * FROM workflow_cases ORDER BY due_date")).rows;
    const filtered=filterRecords(rows,{q:req.query.q||"",status:req.query.status||"",risk:req.query.risk||"",workflow:req.query.workflow||""});
    if(String(req.query.format||"json").toLowerCase()==="csv"){ res.setHeader("Content-Type","text/csv"); res.setHeader("Content-Disposition",'attachment; filename="meal-records.csv"'); return res.send(recordsToCsv(filtered)); }
    res.json({items:filtered,count:filtered.length});
  });
  app.get("/api/records/insights", async(req,res)=>{
    const rows=(await pool.query("SELECT * FROM workflow_cases ORDER BY due_date")).rows;
    res.json(buildInsights(filterRecords(rows,{q:req.query.q||"",workflow:req.query.workflow||""})));
  });
}

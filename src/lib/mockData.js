export const policies = [
  {
    id: "PROCUREMENT-2026",
    version: "v2026.1",
    label: "Current — Relaxed (June 2026)",
    effectiveFrom: "2026-06-15",
    updatedBy: "Ministry / NAFED",
    sizeBand: { min: 35, max: 70 },
    tolerances: { rotten: 2, sprouted: 3, damaged: 5 },
    description: "Widened size band from 45–65mm to 35–70mm after Lasalgaon review. Applied to Price Stabilisation Fund procurement.",
    isActive: true,
  },
  {
    id: "PROCUREMENT-2025",
    version: "v2025.2",
    label: "Previous — Standard",
    effectiveFrom: "2025-04-01",
    updatedBy: "Ministry / NAFED",
    sizeBand: { min: 45, max: 65 },
    tolerances: { rotten: 1, sprouted: 2, damaged: 3 },
    description: "AGMARK-aligned standard procurement band used before June 2026 relaxation.",
    isActive: false,
  },
  {
    id: "PROCUREMENT-AGMARK",
    version: "vAGMARK-1",
    label: "AGMARK Reference",
    effectiveFrom: "2024-01-01",
    updatedBy: "AGMARK / ICAR-DOGR",
    sizeBand: { min: 30, max: 80 },
    tolerances: { rotten: 1, sprouted: 1, damaged: 2 },
    description: "Reference AGMARK grade bands (A >80mm, B 50–80mm, C 30–50mm) — not used for active procurement.",
    isActive: false,
  },
];

export const demoOnions = [
  { id:"O1", sizeMm:72, defect:"Healthy", confidence:94, box:{x:8,y:12,w:22,h:22} },
  { id:"O2", sizeMm:65, defect:"Damaged", confidence:82, box:{x:38,y:18,w:20,h:20} },
  { id:"O3", sizeMm:58, defect:"Healthy", confidence:91, box:{x:68,y:14,w:18,h:18} },
  { id:"O4", sizeMm:69, defect:"Rotten", confidence:96, box:{x:14,y:52,w:21,h:21} },
  { id:"O5", sizeMm:61, defect:"Healthy", confidence:89, box:{x:44,y:56,w:19,h:19} },
  { id:"O6", sizeMm:42, defect:"Healthy", confidence:88, box:{x:72,y:50,w:16,h:16} },
  { id:"O7", sizeMm:74, defect:"Healthy", confidence:93, box:{x:5,y:78,w:23,h:17} },
  { id:"O8", sizeMm:33, defect:"Sprouted", confidence:47, box:{x:36,y:80,w:15,h:15} },
  { id:"O9", sizeMm:67, defect:"Damaged", confidence:38, box:{x:62,y:78,w:20,h:18} },
  { id:"O10", sizeMm:55, defect:"Healthy", confidence:90, box:{x:80,y:30,w:14,h:14} },
];

export const assessmentsSeed = [
  {
    id:"OG-2026-0241", lotId:"LOT-0241", farmer:"Ramesh Patil", center:"Lasalgaon APMC — NAFED", location:"Nashik, MH",
    date:"2026-09-05T10:24:00", assessor:"S. Kulkarni (Grader)",
    policyVersion:"v2026.1", modelVersion:"Prototype Demo Inference",
    sampleSize:100, gradeA:68, urs:32, status:"Completed", sync:"Synced",
    humanReviews:3, confidence:84,
    onions: demoOnions,
    hash:"a3f9c1e7 8b2d 4f0a 9e11 d6c3a5b8e902",
    acknowledged:{ farmer:true, grader:true },
  },
  {
    id:"OG-2026-0240", lotId:"LOT-0240", farmer:"Sunita Deshmukh", center:"Pimpalgaon APMC", location:"Nashik, MH",
    date:"2026-09-05T09:10:00", assessor:"A. Jadhav",
    policyVersion:"v2026.1", modelVersion:"Prototype Demo Inference",
    sampleSize:50, gradeA:52, urs:48, status:"Human Review", sync:"Synced",
    humanReviews:2, confidence:47,
    onions: demoOnions.slice(0,5),
    hash:"71b0e4d2 c9a8 4f33 b1e0 8f2a9c6d3e11",
    acknowledged:{ farmer:false, grader:false },
  },
  {
    id:"OG-2026-0239", lotId:"LOT-0239", farmer:"Vijay Shinde", center:"Lasalgaon APMC — NCCF", location:"Nashik, MH",
    date:"2026-09-04T16:40:00", assessor:"S. Kulkarni",
    policyVersion:"v2025.2", modelVersion:"Prototype Demo Inference",
    sampleSize:50, gradeA:61, urs:39, status:"Completed", sync:"Synced",
    humanReviews:1, confidence:92,
    onions: demoOnions.slice(0,5),
    hash:"c4e9b1a0 2f88 4d1a a772 9e0b3c5d6f01",
    acknowledged:{ farmer:true, grader:true },
  },
  {
    id:"OG-2026-0238", lotId:"LOT-0238", farmer:"Anil Pawar", center:"Manmad APMC", location:"Nashik, MH",
    date:"2026-09-04T11:02:00", assessor:"P. More",
    policyVersion:"v2026.1", modelVersion:"Prototype Demo Inference",
    sampleSize:50, gradeA:74, urs:26, status:"Disputed", sync:"Synced",
    humanReviews:4, confidence:55,
    onions: demoOnions.slice(0,5),
    hash:"e8f1a2c3 9b0d 4c77 8a11 3f6e9d2b5c44",
    acknowledged:{ farmer:false, grader:true },
    dispute:{ reason:"Farmer requested second review — claims Grade A undercounted", at:"2026-09-04T15:00:00", by:"Farmer" },
  },
  {
    id:"OG-2026-0237", lotId:"LOT-0237", farmer:"Kavita More", center:"Lasalgaon APMC — NAFED", location:"Nashik, MH",
    date:"2026-09-03T14:20:00", assessor:"S. Kulkarni",
    policyVersion:"v2026.1", modelVersion:"Prototype Demo Inference",
    sampleSize:30, gradeA:0, urs:100, status:"Sync Pending", sync:"Offline",
    humanReviews:0, confidence:91,
    onions: demoOnions.slice(0,3),
    hash:"pending — will generate on finalize",
    acknowledged:{ farmer:false, grader:false },
  },
];

export function generateId(){
  const n = Math.floor(1000+Math.random()*9000);
  return `OG-2026-${String(n).padStart(4,'0')}`;
}
export function generateLotId(){
  const n = Math.floor(1000+Math.random()*9000);
  return `LOT-${String(n).padStart(4,'0')}`;
}

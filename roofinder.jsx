import { useState, useEffect } from "react";

// Load brand fonts
const FontLoader = () => {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&family=DM+Serif+Display:ital@0;1&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);
  return null;
};

const roofers = [
  { id: 1, name: "Apex Roofing Co.", owner: "Mike Harmon", location: "Charlotte, NC", rating: 4.9, reviews: 142, specialties: ["Storm Damage", "Insurance Claims", "Shingles"], yearsExp: 12, verified: true, responseTime: "< 1 hour", jobsDone: 430, bio: "Family-owned operation specializing in storm restoration and insurance claim assistance. We work directly with adjusters to maximize your coverage and get your roof replaced fast.", phone: "(704) 555-0182", website: "apexroofingco.com", license: "NC #45821", badges: ["Top Rated", "Insurance Expert"] },
  { id: 2, name: "Ridgeline Roofing", owner: "Carlos Vega", location: "Charlotte, NC", rating: 4.8, reviews: 98, specialties: ["Metal Roofing", "Flat Roofs", "Commercial"], yearsExp: 9, verified: true, responseTime: "< 2 hours", jobsDone: 310, bio: "Commercial and residential specialists with deep expertise in metal and flat roof systems. Trusted by property managers and HOAs across the greater Charlotte region.", phone: "(704) 555-0247", website: "ridgelineroofing.com", license: "NC #38904", badges: ["Commercial Pro"] },
  { id: 3, name: "SkyShield Roofing", owner: "Dana Brooks", location: "Concord, NC", rating: 4.7, reviews: 74, specialties: ["Shingles", "Gutters", "Inspections"], yearsExp: 6, verified: true, responseTime: "Same day", jobsDone: 198, bio: "Affordable, reliable roofing with free inspections for every homeowner. We handle everything from minor repairs to full replacements with zero hassle and zero pressure.", phone: "(704) 555-0391", website: "skyshieldroofing.com", license: "NC #51203", badges: ["Free Inspections"] },
  { id: 4, name: "Summit Pro Roofing", owner: "James Whitfield", location: "Huntersville, NC", rating: 4.6, reviews: 55, specialties: ["Storm Damage", "Tile Roofing", "Insurance Claims"], yearsExp: 8, verified: false, responseTime: "< 3 hours", jobsDone: 167, bio: "Storm restoration experts who know the insurance process inside and out. We advocate for homeowners and make sure you get the roof replacement you deserve.", phone: "(704) 555-0418", website: "summitproroofing.com", license: "NC #47112", badges: ["Storm Specialist"] },
  { id: 5, name: "Iron Peak Roofing", owner: "Terri Nguyen", location: "Matthews, NC", rating: 4.5, reviews: 41, specialties: ["Metal Roofing", "Solar Ready", "New Construction"], yearsExp: 5, verified: true, responseTime: "< 4 hours", jobsDone: 122, bio: "Modern roofing solutions for new construction and retrofits. Specializing in metal and solar-ready installations engineered for longevity and energy efficiency.", phone: "(704) 555-0534", website: "ironpeakroofing.com", license: "NC #52801", badges: ["Solar Ready"] },
  { id: 6, name: "BlueSky Contractors", owner: "Robert Finch", location: "Gastonia, NC", rating: 4.8, reviews: 119, specialties: ["Shingles", "Storm Damage", "Repairs"], yearsExp: 14, verified: true, responseTime: "< 1 hour", jobsDone: 512, bio: "Over a decade serving the Gastonia area. We treat every roof like it's our own — honest pricing, quality materials, and workmanship guaranteed for 10 years.", phone: "(704) 555-0612", website: "blueskycontractors.com", license: "NC #31045", badges: ["Top Rated", "10yr Warranty"] },
  { id: 7, name: "Carolina Roof Masters", owner: "Angela Price", location: "Rock Hill, SC", rating: 4.7, reviews: 88, specialties: ["Tile Roofing", "Slate", "Luxury Homes"], yearsExp: 11, verified: true, responseTime: "< 2 hours", jobsDone: 284, bio: "Specialists in premium roofing materials for luxury and historic homes. If you want it done right the first time with materials that last 50+ years, call us.", phone: "(803) 555-0724", website: "carolinaroofmasters.com", license: "SC #29341", badges: ["Luxury Specialist"] },
  { id: 8, name: "StormGuard Roofing", owner: "Derek Thompson", location: "Kannapolis, NC", rating: 4.6, reviews: 63, specialties: ["Storm Damage", "Insurance Claims", "Emergency"], yearsExp: 7, verified: true, responseTime: "24/7 Emergency", jobsDone: 221, bio: "24/7 emergency response for storm damage. We tarp, document, and restore — and we fight alongside you through the entire insurance claim process.", phone: "(704) 555-0835", website: "stormguardroofing.com", license: "NC #48833", badges: ["24/7 Emergency", "Insurance Expert"] },
  { id: 9, name: "Pinnacle Roofing Group", owner: "Sandra Mills", location: "Monroe, NC", rating: 4.9, reviews: 201, specialties: ["Shingles", "Metal Roofing", "Commercial"], yearsExp: 16, verified: true, responseTime: "< 1 hour", jobsDone: 680, bio: "The most reviewed roofing company in Union County. Residential and commercial roofing done on time, on budget, and backed by our industry-leading warranty.", phone: "(704) 555-0941", website: "pinnaclegroup.com", license: "NC #28712", badges: ["Top Rated", "Most Reviewed"] },
  { id: 10, name: "Valor Roofing LLC", owner: "Chris Davenport", location: "Indian Trail, NC", rating: 4.5, reviews: 37, specialties: ["New Construction", "Shingles", "Gutters"], yearsExp: 4, verified: false, responseTime: "< 3 hours", jobsDone: 98, bio: "Veteran-owned roofing company committed to integrity and quality craftsmanship. We bring military precision to every job, big or small.", phone: "(704) 555-1053", website: "valorroofing.com", license: "NC #54102", badges: ["Veteran Owned"] },
  { id: 11, name: "Trident Roofing", owner: "Maria Santos", location: "Mooresville, NC", rating: 4.7, reviews: 76, specialties: ["Flat Roofs", "TPO", "Commercial"], yearsExp: 10, verified: true, responseTime: "< 2 hours", jobsDone: 245, bio: "Lake Norman's go-to commercial roofing contractor. We specialize in flat roof systems, TPO membranes, and preventative maintenance programs for businesses.", phone: "(704) 555-1164", website: "tridentroofing.com", license: "NC #40198", badges: ["Commercial Pro"] },
  { id: 12, name: "Greenway Roofing", owner: "Paul Okafor", location: "Fort Mill, SC", rating: 4.6, reviews: 52, specialties: ["Solar Ready", "Metal Roofing", "Energy Efficient"], yearsExp: 6, verified: true, responseTime: "< 3 hours", jobsDone: 143, bio: "Future-forward roofing designed for energy efficiency and solar integration. We help homeowners cut energy costs while protecting their biggest investment.", phone: "(803) 555-1278", website: "greenwayroofing.com", license: "SC #31887", badges: ["Solar Ready", "Eco Friendly"] },
  { id: 13, name: "Heritage Roof & Restore", owner: "Tom Bellamy", location: "Salisbury, NC", rating: 4.8, reviews: 109, specialties: ["Slate", "Historic Restoration", "Tile Roofing"], yearsExp: 18, verified: true, responseTime: "< 2 hours", jobsDone: 390, bio: "Specialists in historic and period-accurate roof restoration. Trusted by preservation societies and historic homeowners who refuse to compromise on authenticity.", phone: "(704) 555-1389", website: "heritageroofing.com", license: "NC #22541", badges: ["Historic Expert", "18yrs Experience"] },
  { id: 14, name: "FastTrack Roofing", owner: "Kevin Marsh", location: "Statesville, NC", rating: 4.4, reviews: 29, specialties: ["Repairs", "Emergency", "Shingles"], yearsExp: 3, verified: false, responseTime: "Same day", jobsDone: 74, bio: "Fast, affordable roofing repairs and replacements for homeowners who need it done now. No upselling, no surprises — just honest work at a fair price.", phone: "(704) 555-1492", website: "fasttrackroofing.com", license: "NC #56234", badges: ["Same Day Service"] },
  { id: 15, name: "Crown Roofing Solutions", owner: "Lisa Chandler", location: "Waxhaw, NC", rating: 4.9, reviews: 167, specialties: ["Shingles", "Insurance Claims", "Storm Damage"], yearsExp: 13, verified: true, responseTime: "< 1 hour", jobsDone: 501, bio: "Award-winning roofing company serving south Charlotte and Waxhaw. We've helped over 500 families navigate storm damage claims and come out ahead.", phone: "(704) 555-1507", website: "crownroofing.com", license: "NC #35612", badges: ["Top Rated", "Award Winning"] },
];

const allSpecialties = ["All", ...new Set(roofers.flatMap(r => r.specialties))];
const badgeColors = {
  "Top Rated": ["#78350F","#FCD34D"], "Insurance Expert": ["#1E3A5F","#60A5FA"],
  "Commercial Pro": ["#1F2937","#9CA3AF"], "Free Inspections": ["#064E3B","#34D399"],
  "Storm Specialist": ["#1E1B4B","#A78BFA"], "Solar Ready": ["#052E16","#4ADE80"],
  "10yr Warranty": ["#7C2D12","#FB923C"], "Luxury Specialist": ["#2D1B69","#C084FC"],
  "24/7 Emergency": ["#7F1D1D","#F87171"], "Most Reviewed": ["#78350F","#FCD34D"],
  "Veteran Owned": ["#1A3A1A","#86EFAC"], "Eco Friendly": ["#052E16","#4ADE80"],
  "Historic Expert": ["#3B1F14","#FDBA74"], "18yrs Experience": ["#1E3A5F","#60A5FA"],
  "Same Day Service": ["#064E3B","#34D399"], "Award Winning": ["#78350F","#FCD34D"],
};

const Stars = ({ rating }) => (
  <div style={{ display:"flex", gap:1 }}>
    {[1,2,3,4,5].map(s => (
      <svg key={s} width="13" height="13" viewBox="0 0 24 24" fill={s<=Math.round(rating)?"#FBBF24":"#D1C9BB"}>
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
      </svg>
    ))}
  </div>
);

const Badge = ({ label }) => {
  const [bg, text] = badgeColors[label] || ["#1F2937","#9CA3AF"];
  return <span style={{ background:bg, color:text, fontSize:10, padding:"2px 8px", borderRadius:20, fontFamily:"sans-serif", fontWeight:700, whiteSpace:"nowrap" }}>{label}</span>;
};

// ── Messaging Modal ───────────────────────────────────
const MessageModal = ({ roofer, user, onClose, onSignup }) => {
  const [step, setStep] = useState(user ? "message" : "signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);

  const handleSignup = () => {
    if (!name.trim() || !email.trim()) return;
    onSignup({ name: name.trim(), email: email.trim() });
    setStep("message");
  };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:420, boxShadow:"0 24px 60px rgba(0,0,0,0.3)", overflow:"hidden" }}>
        <div style={{ background:"#1A1A1A", padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ color:"#fff", fontWeight:700, fontSize:15 }}>{roofer.name}</div>
            <div style={{ color:"#9CA3AF", fontSize:12, fontFamily:"sans-serif" }}>{roofer.location}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#9CA3AF", fontSize:22, cursor:"pointer" }}>×</button>
        </div>
        <div style={{ padding:24 }}>
          {sent ? (
            <div style={{ textAlign:"center", padding:"16px 0" }}>
              <div style={{ fontSize:44, marginBottom:10 }}>✅</div>
              <div style={{ fontSize:17, fontWeight:700, color:"#111", marginBottom:8 }}>Message Sent!</div>
              <div style={{ color:"#6B7280", fontFamily:"sans-serif", fontSize:13, lineHeight:1.6, marginBottom:16 }}>
                {roofer.name} will reply through RooFinder. No cold calls unless you want them.
              </div>
              <button onClick={onClose} style={{ background:"#C8102E", color:"#fff", border:"none", borderRadius:8, padding:"11px 32px", fontSize:14, fontFamily:"sans-serif", fontWeight:700, cursor:"pointer" }}>Done</button>
            </div>
          ) : step === "signup" ? (
            <>
              <div style={{ fontSize:16, fontWeight:700, color:"#111", marginBottom:6 }}>Quick account to send message</div>
              <div style={{ color:"#6B7280", fontFamily:"sans-serif", fontSize:13, lineHeight:1.6, marginBottom:16 }}>
                Just name + email. No phone required. They reply here — <strong>no cold calls.</strong>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:14 }}>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your first name" style={{ padding:"11px 14px", border:"1.5px solid #E5E0D8", borderRadius:8, fontSize:14, fontFamily:"sans-serif", outline:"none", color:"#111" }}/>
                <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" type="email" style={{ padding:"11px 14px", border:"1.5px solid #E5E0D8", borderRadius:8, fontSize:14, fontFamily:"sans-serif", outline:"none", color:"#111" }}/>
              </div>
              <button onClick={handleSignup} disabled={!name.trim()||!email.trim()} style={{ width:"100%", background:name.trim()&&email.trim()?"#C8102E":"#E5E0D8", color:name.trim()&&email.trim()?"#fff":"#9CA3AF", border:"none", borderRadius:8, padding:"12px", fontSize:15, fontFamily:"sans-serif", fontWeight:700, cursor:name.trim()&&email.trim()?"pointer":"default" }}>
                Continue →
              </button>
              <div style={{ textAlign:"center", marginTop:10, color:"#9CA3AF", fontSize:11, fontFamily:"sans-serif" }}>🔒 We never sell your info</div>
            </>
          ) : (
            <>
              <div style={{ fontSize:15, fontWeight:700, color:"#111", marginBottom:4 }}>Message {roofer.name}</div>
              <div style={{ color:"#6B7280", fontFamily:"sans-serif", fontSize:13, marginBottom:12 }}>They reply through RooFinder — no calls unless you want them.</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
                {["I think I have storm damage","I need a free inspection","I'd like a quote","I need emergency repair"].map(p => (
                  <button key={p} onClick={()=>setMsg(p)} style={{ background:msg===p?"#FEF2F2":"#F7F5F0", border:`1px solid ${msg===p?"#C8102E":"#E5E0D8"}`, color:msg===p?"#C8102E":"#4B4B4B", borderRadius:20, padding:"5px 10px", fontSize:11, fontFamily:"sans-serif", cursor:"pointer" }}>{p}</button>
                ))}
              </div>
              <textarea value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Add any details..." rows={3} style={{ width:"100%", padding:"11px 14px", border:"1.5px solid #E5E0D8", borderRadius:8, fontSize:13, fontFamily:"sans-serif", resize:"none", outline:"none", color:"#111", boxSizing:"border-box" }}/>
              <button onClick={()=>setSent(true)} disabled={!msg.trim()} style={{ width:"100%", marginTop:10, background:msg.trim()?"#C8102E":"#E5E0D8", color:msg.trim()?"#fff":"#9CA3AF", border:"none", borderRadius:8, padding:"12px", fontSize:15, fontFamily:"sans-serif", fontWeight:700, cursor:msg.trim()?"pointer":"default" }}>
                Send Message
              </button>
              <div style={{ textAlign:"center", marginTop:8, color:"#9CA3AF", fontSize:11, fontFamily:"sans-serif" }}>🔒 Your phone is never shared unless you choose</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Urgent Flow ───────────────────────────────────────
const urgentSteps = [
  {
    key: "issue",
    question: "What's going on with your roof?",
    subtitle: "Pick the option that best describes your situation",
    options: [
      { label: "🌩️ Storm Damage", desc: "Hail, wind, or water damage" },
      { label: "🔧 Repair Needed", desc: "Leak, missing shingles, or damage" },
      { label: "🏠 Full Replacement", desc: "Old roof or major damage" },
      { label: "🔍 Inspection", desc: "Want someone to take a look" },
    ],
  },
  {
    key: "insurance",
    question: "Will you be using insurance?",
    subtitle: "This helps us match you with the right contractor",
    options: [
      { label: "✅ Yes — filing a claim", desc: "I want help with the insurance process" },
      { label: "💳 No — paying out of pocket", desc: "I'll be paying directly" },
      { label: "🤔 Not sure yet", desc: "I need to find out if I'm covered" },
    ],
  },
  {
    key: "timeline",
    question: "How soon do you need this done?",
    subtitle: "We'll prioritize accordingly",
    options: [
      { label: "🚨 Emergency — today", desc: "Active leak or major damage" },
      { label: "📅 This week", desc: "Soon but not emergency" },
      { label: "🗓️ Within a month", desc: "Planning ahead" },
      { label: "⏳ Just getting quotes", desc: "No rush, exploring options" },
    ],
  },
  {
    key: "contact",
    question: "How would you like to be contacted?",
    subtitle: "You control this — pick what's comfortable",
    options: [
      { label: "💬 Text message", desc: "Quick and easy" },
      { label: "📧 Email only", desc: "No calls, ever" },
      { label: "📞 Phone call is fine", desc: "I'm okay with a call" },
      { label: "📱 Any of the above", desc: "Whatever's fastest" },
    ],
  },
];

const UrgentFlow = ({ onBack }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [zip, setZip] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const current = urgentSteps[step];
  const isLast = step === urgentSteps.length - 1;

  const handleOption = (label) => {
    const newAnswers = { ...answers, [current.key]: label };
    setAnswers(newAnswers);
    if (!isLast) setTimeout(() => setStep(step + 1), 220);
  };

  const handleSubmit = () => {
    if (!name.trim() || !email.trim() || !zip.trim()) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "60px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111", marginBottom: 10 }}>You're all set!</h2>
        <p style={{ color: "#6B7280", fontFamily: "sans-serif", fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
          We're matching you with verified roofers in your area based on your needs. They'll reach out via <strong>{answers.contact?.replace(/^[^\s]+\s/, "")}</strong> — no surprises.
        </p>
        <div style={{ background: "#F7F5F0", borderRadius: 12, padding: "20px", marginBottom: 24, textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 12, fontFamily: "sans-serif" }}>Your request summary</div>
          {Object.entries(answers).map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #E5E0D8" }}>
              <span style={{ color: "#9CA3AF", fontSize: 12, fontFamily: "sans-serif", textTransform: "capitalize" }}>{k}</span>
              <span style={{ color: "#111", fontSize: 12, fontFamily: "sans-serif", fontWeight: 600 }}>{v}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #E5E0D8" }}>
            <span style={{ color: "#9CA3AF", fontSize: 12, fontFamily: "sans-serif" }}>Zip Code</span>
            <span style={{ color: "#111", fontSize: 12, fontFamily: "sans-serif", fontWeight: 600 }}>{zip}</span>
          </div>
        </div>
        <button onClick={onBack} style={{ background: "#C8102E", color: "#fff", border: "none", borderRadius: 8, padding: "12px 32px", fontSize: 14, fontFamily: "sans-serif", fontWeight: 700, cursor: "pointer" }}>
          Browse Contractors
        </button>
      </div>
    );
  }

  // Contact info step (after all questions)
  if (answers.contact && step === urgentSteps.length - 1 && answers.contact) {
    const allAnswered = Object.keys(answers).length === urgentSteps.length;
    if (allAnswered) {
      return (
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 24px" }}>
          <button onClick={() => { setStep(step - 1); const a = {...answers}; delete a.contact; setAnswers(a); }} style={{ background: "none", border: "none", color: "#9CA3AF", fontFamily: "sans-serif", fontSize: 13, cursor: "pointer", marginBottom: 24, padding: 0 }}>
            ← Back
          </button>
          <div style={{ marginBottom: 8 }}>
            <div style={{ background: "#F0EDE8", borderRadius: 20, height: 4, marginBottom: 20 }}>
              <div style={{ background: "#C8102E", borderRadius: 20, height: 4, width: "100%" }}/>
            </div>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 6 }}>Almost done</h2>
          <p style={{ color: "#6B7280", fontFamily: "sans-serif", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            Last step — where should contractors reach you? No spam. You're in control.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your first name" style={{ padding:"12px 14px", border:"1.5px solid #E5E0D8", borderRadius:8, fontSize:14, fontFamily:"sans-serif", outline:"none", color:"#111" }}/>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" type="email" style={{ padding:"12px 14px", border:"1.5px solid #E5E0D8", borderRadius:8, fontSize:14, fontFamily:"sans-serif", outline:"none", color:"#111" }}/>
            <input value={zip} onChange={e=>setZip(e.target.value)} placeholder="Zip code" style={{ padding:"12px 14px", border:"1.5px solid #E5E0D8", borderRadius:8, fontSize:14, fontFamily:"sans-serif", outline:"none", color:"#111" }}/>
          </div>
          <div style={{ background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:8, padding:"12px 16px", marginBottom:20 }}>
            <div style={{ color:"#15803D", fontSize:12, fontFamily:"sans-serif", lineHeight:1.6 }}>
              🔒 <strong>Your number is never required.</strong> Contractors will only contact you via {answers.contact?.split("—")[0].replace(/[^\w\s]/g,"").trim().toLowerCase()}.
            </div>
          </div>
          <button onClick={handleSubmit} disabled={!name.trim()||!email.trim()||!zip.trim()} style={{ width:"100%", background:name.trim()&&email.trim()&&zip.trim()?"#C8102E":"#E5E0D8", color:name.trim()&&email.trim()&&zip.trim()?"#fff":"#9CA3AF", border:"none", borderRadius:8, padding:"14px", fontSize:16, fontFamily:"sans-serif", fontWeight:700, cursor:name.trim()&&email.trim()&&zip.trim()?"pointer":"default" }}>
            Find Me a Contractor →
          </button>
        </div>
      );
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 24px" }}>
      {step > 0 && (
        <button onClick={() => setStep(step - 1)} style={{ background:"none", border:"none", color:"#9CA3AF", fontFamily:"sans-serif", fontSize:13, cursor:"pointer", marginBottom:24, padding:0 }}>
          ← Back
        </button>
      )}

      {/* Progress bar */}
      <div style={{ background:"#F0EDE8", borderRadius:20, height:4, marginBottom:28 }}>
        <div style={{ background:"#C8102E", borderRadius:20, height:4, width:`${((step+1)/urgentSteps.length)*100}%`, transition:"width 0.3s" }}/>
      </div>

      <div style={{ fontSize:11, color:"#C8102E", fontFamily:"sans-serif", fontWeight:700, letterSpacing:"1px", marginBottom:8 }}>
        STEP {step+1} OF {urgentSteps.length}
      </div>
      <h2 style={{ fontSize:22, fontWeight:700, color:"#111", marginBottom:6 }}>{current.question}</h2>
      <p style={{ color:"#6B7280", fontFamily:"sans-serif", fontSize:14, marginBottom:24, lineHeight:1.5 }}>{current.subtitle}</p>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {current.options.map(opt => {
          const selected = answers[current.key] === opt.label;
          return (
            <button
              key={opt.label}
              onClick={() => handleOption(opt.label)}
              style={{
                background: selected ? "#FEF2F2" : "#fff",
                border: `2px solid ${selected ? "#C8102E" : "#E5E0D8"}`,
                borderRadius: 10, padding: "14px 16px",
                display: "flex", alignItems: "center", gap: 14,
                cursor: "pointer", textAlign: "left",
                transition: "all 0.15s",
              }}
            >
              <div style={{ fontSize: 22 }}>{opt.label.split(" ")[0]}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: selected ? "#C8102E" : "#111", fontFamily: "sans-serif" }}>
                  {opt.label.split(" ").slice(1).join(" ")}
                </div>
                <div style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "sans-serif", marginTop: 2 }}>{opt.desc}</div>
              </div>
              {selected && <div style={{ marginLeft:"auto", color:"#C8102E", fontSize:18 }}>✓</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── Browse Tab ────────────────────────────────────────
const BrowseTab = ({ user, onSignup, onUrgent }) => {
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("All");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("rating");
  const [selected, setSelected] = useState(null);
  const [messaging, setMessaging] = useState(null);

  const filtered = roofers
    .filter(r => {
      const q = search.toLowerCase();
      return (
        (r.name.toLowerCase().includes(q) || r.location.toLowerCase().includes(q) || r.owner.toLowerCase().includes(q)) &&
        (specialty === "All" || r.specialties.includes(specialty)) &&
        (!verifiedOnly || r.verified)
      );
    })
    .sort((a,b) => sortBy==="rating" ? b.rating-a.rating : sortBy==="reviews" ? b.reviews-a.reviews : b.yearsExp-a.yearsExp);

  return (
    <>
      {messaging && <MessageModal roofer={messaging} user={user} onClose={()=>setMessaging(null)} onSignup={onSignup}/>}

      {/* Search */}
      <div style={{ background:"linear-gradient(135deg,#1A1A1A 0%,#2D1515 100%)", padding:"28px 24px", borderBottom:"3px solid #C8102E" }}>
        <div style={{ maxWidth:1000, margin:"0 auto" }}>
          <p style={{ color:"#9CA3AF", fontFamily:"'DM Sans',sans-serif", fontSize:13, margin:"0 0 14px" }}>
            Browse freely. Message who you want. <strong style={{color:"#fff"}}>No spam calls, ever.</strong>
          </p>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, city, or specialty..." style={{ flex:1, minWidth:200, background:"#fff", border:"none", borderRadius:8, padding:"11px 16px", fontSize:14, fontFamily:"sans-serif", outline:"none", color:"#111" }}/>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ background:"#2A2A2A", color:"#E5E5E5", border:"1px solid #3A3A3A", borderRadius:8, padding:"11px 14px", fontSize:13, fontFamily:"sans-serif", cursor:"pointer" }}>
              <option value="rating">Top Rated</option>
              <option value="reviews">Most Reviewed</option>
              <option value="experience">Most Experience</option>
            </select>
          </div>
          {/* Need One Today CTA */}
          <div style={{ marginTop:14, background:"rgba(200,16,46,0.12)", border:"1px solid rgba(200,16,46,0.3)", borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
            <div>
              <div style={{ color:"#fff", fontSize:14, fontWeight:700, fontFamily:"'DM Sans',sans-serif" }}>🚨 Need someone fast?</div>
              <div style={{ color:"#FCA5A5", fontSize:12, fontFamily:"sans-serif", marginTop:2 }}>Answer 4 questions and we'll match you with the right contractor.</div>
            </div>
            <button onClick={onUrgent} style={{ background:"#C8102E", color:"#fff", border:"none", borderRadius:8, padding:"9px 18px", fontSize:13, fontFamily:"sans-serif", fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
              Need One Today →
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1000, margin:"0 auto", padding:"24px" }}>
        {/* Filters */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
          {allSpecialties.map(s => (
            <button key={s} onClick={()=>setSpecialty(s)} style={{ padding:"6px 14px", borderRadius:20, border:`1.5px solid ${specialty===s?"#C8102E":"#D1C9BB"}`, background:specialty===s?"#C8102E":"#fff", color:specialty===s?"#fff":"#4B4B4B", fontSize:12, fontFamily:"sans-serif", cursor:"pointer", fontWeight:specialty===s?700:400 }}>{s}</button>
          ))}
          <button onClick={()=>setVerifiedOnly(!verifiedOnly)} style={{ padding:"6px 14px", borderRadius:20, border:`1.5px solid ${verifiedOnly?"#059669":"#D1C9BB"}`, background:verifiedOnly?"#059669":"#fff", color:verifiedOnly?"#fff":"#4B4B4B", fontSize:12, fontFamily:"sans-serif", cursor:"pointer", marginLeft:"auto" }}>✓ Verified Only</button>
        </div>

        <div style={{ color:"#9CA3AF", fontSize:12, fontFamily:"sans-serif", marginBottom:16 }}>{filtered.length} contractors found</div>

        {/* Grid */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:16 }}>
          {filtered.map(r => (
            <div key={r.id} onClick={()=>setSelected(selected?.id===r.id?null:r)} style={{ background:"#fff", borderRadius:12, border:`2px solid ${selected?.id===r.id?"#C8102E":"transparent"}`, boxShadow:selected?.id===r.id?"0 8px 30px rgba(200,16,46,0.12)":"0 2px 12px rgba(0,0,0,0.07)", cursor:"pointer", transition:"all 0.2s", overflow:"hidden" }}>
              <div style={{ background:"#1A1A1A", padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>{r.badges.slice(0,2).map(b=><Badge key={b} label={b}/>)}</div>
                {r.verified && <span style={{ color:"#34D399", fontSize:10, fontFamily:"sans-serif", fontWeight:700 }}>✓ VERIFIED</span>}
              </div>
              <div style={{ padding:"14px" }}>
                <div style={{ fontSize:16, fontWeight:700, color:"#111", marginBottom:2 }}>{r.name}</div>
                <div style={{ color:"#6B7280", fontSize:12, fontFamily:"sans-serif", marginBottom:10 }}>{r.owner} · {r.location}</div>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                  <Stars rating={r.rating}/>
                  <span style={{ fontWeight:700, fontSize:14, color:"#111", fontFamily:"sans-serif" }}>{r.rating}</span>
                  <span style={{ color:"#9CA3AF", fontSize:12, fontFamily:"sans-serif" }}>({r.reviews})</span>
                </div>
                <div style={{ display:"flex", background:"#F7F5F0", borderRadius:8, overflow:"hidden", marginBottom:12 }}>
                  {[{v:`${r.yearsExp}yr`,l:"Exp"},{v:r.jobsDone,l:"Jobs"},{v:r.responseTime,l:"Response"}].map((s,i)=>(
                    <div key={i} style={{ flex:1, padding:"7px 4px", textAlign:"center", borderRight:i<2?"1px solid #E5E0D8":"none" }}>
                      <div style={{ fontSize:12, fontWeight:700, color:"#111", fontFamily:"sans-serif" }}>{s.v}</div>
                      <div style={{ fontSize:10, color:"#9CA3AF", fontFamily:"sans-serif" }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:12 }}>
                  {r.specialties.map(s=><span key={s} style={{ background:"#F0EDE8", color:"#6B6055", fontSize:11, padding:"3px 8px", borderRadius:20, fontFamily:"sans-serif" }}>{s}</span>)}
                </div>
                {selected?.id===r.id ? (
                  <div style={{ borderTop:"1px solid #F0EDE8", paddingTop:14 }}>
                    <p style={{ color:"#4B4B4B", fontSize:13, fontFamily:"sans-serif", lineHeight:1.7, marginBottom:14 }}>{r.bio}</p>
                    <div style={{ fontSize:11, color:"#9CA3AF", fontFamily:"sans-serif", marginBottom:14 }}>License: {r.license}</div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={e=>{e.stopPropagation();setMessaging(r);}} style={{ flex:1, background:"#C8102E", color:"#fff", border:"none", borderRadius:8, padding:"11px 0", fontSize:14, fontFamily:"sans-serif", fontWeight:700, cursor:"pointer" }}>💬 Send Message</button>
                      <a href={`tel:${r.phone}`} onClick={e=>e.stopPropagation()} style={{ background:"#F0EDE8", color:"#4B4B4B", borderRadius:8, padding:"11px 14px", fontSize:13, textDecoration:"none", display:"flex", alignItems:"center" }}>📞</a>
                      <a href={`https://${r.website}`} onClick={e=>e.stopPropagation()} target="_blank" rel="noreferrer" style={{ background:"#F0EDE8", color:"#4B4B4B", borderRadius:8, padding:"11px 14px", fontSize:13, textDecoration:"none", display:"flex", alignItems:"center" }}>🌐</a>
                    </div>
                    <div style={{ marginTop:8, fontSize:11, color:"#9CA3AF", fontFamily:"sans-serif", textAlign:"center" }}>📵 Your phone is never shared unless you choose</div>
                  </div>
                ) : (
                  <div style={{ color:"#C8102E", fontSize:12, fontFamily:"sans-serif", fontWeight:600 }}>Tap to view & message →</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

// ── Logo SVG Component ────────────────────────────────
const LogoIcon = ({ size = 48 }) => (
  <svg style={{width:size,height:size,filter:"drop-shadow(0 0 10px rgba(200,16,46,0.5))",flexShrink:0}} viewBox="0 0 100 100" fill="none">
    <defs>
      <linearGradient id="logoRoof" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E8192E"/>
        <stop offset="100%" stopColor="#8B0A1E"/>
      </linearGradient>
    </defs>
    <rect x="18" y="52" width="52" height="38" rx="2" fill="#2A2A2A"/>
    <rect x="38" y="66" width="14" height="24" rx="2" fill="#111"/>
    <polygon points="10,55 50,18 90,55" fill="url(#logoRoof)"/>
    <polyline points="10,55 50,18 90,55" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinejoin="round"/>
    <circle cx="72" cy="38" r="18" fill="#0D0D0D" stroke="#C8102E" strokeWidth="4"/>
    <circle cx="72" cy="38" r="11" fill="none" stroke="rgba(200,16,46,0.3)" strokeWidth="1.5"/>
    <line x1="85" y1="51" x2="96" y2="62" stroke="#C8102E" strokeWidth="5" strokeLinecap="round"/>
    <line x1="67" y1="38" x2="77" y2="38" stroke="#C8102E" strokeWidth="2" strokeLinecap="round"/>
    <line x1="72" y1="33" x2="72" y2="43" stroke="#C8102E" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// ── Landing Page ──────────────────────────────────────
const LandingPage = ({ onBrowse, onUrgent }) => (
  <div style={{
    minHeight: "100vh",
    background: "#0A0A0A",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 24px",
    position: "relative",
    overflow: "hidden",
  }}>
    {/* Background glow */}
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none",
      background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(200,16,46,0.15) 0%, transparent 70%)",
    }}/>
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", pointerEvents: "none",
      background: "radial-gradient(ellipse 60% 60% at 50% 100%, rgba(200,16,46,0.07) 0%, transparent 70%)",
    }}/>

    {/* Logo */}
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:16 }}>
      <LogoIcon size={90}/>
      <div style={{
        fontFamily:"'Bebas Neue','Georgia',serif",
        fontSize: 72,
        letterSpacing: "3px",
        color: "#fff",
        lineHeight: 1,
        marginTop: 12,
      }}>
        Roo<span style={{color:"#C8102E"}}>Finder</span>
      </div>
      <div style={{
        fontFamily:"'DM Serif Display','Georgia',serif",
        fontStyle: "italic",
        fontSize: 18,
        color: "#6B7280",
        marginTop: 8,
        letterSpacing: "0.5px",
      }}>
        Find your roof. Trust who you hire.
      </div>
    </div>

    {/* Divider */}
    <div style={{ width:1, height:48, background:"linear-gradient(to bottom, transparent, #3A3A3A, transparent)", margin:"8px 0 32px" }}/>

    {/* CTA label */}
    <div style={{ fontSize:11, fontWeight:700, letterSpacing:"4px", color:"#C8102E", fontFamily:"sans-serif", textTransform:"uppercase", marginBottom:24 }}>
      How can we help you today?
    </div>

    {/* Big choice buttons */}
    <div style={{ display:"flex", flexDirection:"column", gap:16, width:"100%", maxWidth:480 }}>

      {/* Just Browsing */}
      <button
        onClick={onBrowse}
        style={{
          background: "#111",
          border: "2px solid #2A2A2A",
          borderRadius: 16,
          padding: "28px 32px",
          cursor: "pointer",
          textAlign: "left",
          transition: "all 0.2s",
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
        onMouseEnter={e => { e.currentTarget.style.border="2px solid #444"; e.currentTarget.style.background="#161616"; }}
        onMouseLeave={e => { e.currentTarget.style.border="2px solid #2A2A2A"; e.currentTarget.style.background="#111"; }}
      >
        <div style={{ fontSize:44, lineHeight:1, flexShrink:0 }}>👀</div>
        <div>
          <div style={{ fontFamily:"'Bebas Neue','Georgia',serif", fontSize:28, letterSpacing:"1px", color:"#fff", lineHeight:1, marginBottom:6 }}>
            Just Browsing
          </div>
          <div style={{ fontFamily:"sans-serif", fontSize:13, color:"#6B7280", lineHeight:1.5 }}>
            Browse all local contractors freely. No signup required. Message who you like, when you're ready.
          </div>
          <div style={{ marginTop:10, display:"flex", gap:12, flexWrap:"wrap" }}>
            {["No forms","No spam calls","You choose"].map(t => (
              <span key={t} style={{ fontSize:11, color:"#4B5563", fontFamily:"sans-serif" }}>✓ {t}</span>
            ))}
          </div>
        </div>
        <div style={{ marginLeft:"auto", color:"#3A3A3A", fontSize:24, flexShrink:0 }}>›</div>
      </button>

      {/* Need One Today */}
      <button
        onClick={onUrgent}
        style={{
          background: "linear-gradient(135deg, #C8102E 0%, #8B0A1E 100%)",
          border: "2px solid transparent",
          borderRadius: 16,
          padding: "28px 32px",
          cursor: "pointer",
          textAlign: "left",
          transition: "all 0.2s",
          display: "flex",
          alignItems: "center",
          gap: 20,
          boxShadow: "0 8px 32px rgba(200,16,46,0.3)",
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow="0 12px 40px rgba(200,16,46,0.5)"; e.currentTarget.style.transform="translateY(-2px)"; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow="0 8px 32px rgba(200,16,46,0.3)"; e.currentTarget.style.transform="translateY(0)"; }}
      >
        <div style={{ fontSize:44, lineHeight:1, flexShrink:0 }}>🚨</div>
        <div>
          <div style={{ fontFamily:"'Bebas Neue','Georgia',serif", fontSize:28, letterSpacing:"1px", color:"#fff", lineHeight:1, marginBottom:6 }}>
            Need One Today
          </div>
          <div style={{ fontFamily:"sans-serif", fontSize:13, color:"rgba(255,255,255,0.75)", lineHeight:1.5 }}>
            Answer 4 quick questions. We match you with the right contractor fast. You pick how they reach you.
          </div>
          <div style={{ marginTop:10, display:"flex", gap:12, flexWrap:"wrap" }}>
            {["Takes 60 seconds","You control contact","Fast match"].map(t => (
              <span key={t} style={{ fontSize:11, color:"rgba(255,255,255,0.6)", fontFamily:"sans-serif" }}>✓ {t}</span>
            ))}
          </div>
        </div>
        <div style={{ marginLeft:"auto", color:"rgba(255,255,255,0.5)", fontSize:24, flexShrink:0 }}>›</div>
      </button>
    </div>

    {/* Stats */}
    <div style={{ display:"flex", gap:40, marginTop:48, flexWrap:"wrap", justifyContent:"center" }}>
      {[
        { v:"15+", l:"Verified Contractors" },
        { v:"$0", l:"To Browse" },
        { v:"0", l:"Spam Calls" },
      ].map(s => (
        <div key={s.l} style={{ textAlign:"center" }}>
          <div style={{ fontFamily:"'Bebas Neue','Georgia',serif", fontSize:32, color:"#C8102E", letterSpacing:"1px", lineHeight:1 }}>{s.v}</div>
          <div style={{ fontSize:11, color:"#4B5563", fontFamily:"sans-serif", marginTop:4, letterSpacing:"1px", textTransform:"uppercase" }}>{s.l}</div>
        </div>
      ))}
    </div>

    <div style={{ marginTop:40, fontSize:11, color:"#374151", fontFamily:"sans-serif", letterSpacing:"1px" }}>
      ROOFINDER.ONLINE
    </div>
  </div>
);

// ── Main App ──────────────────────────────────────────
export default function RooFinder() {
  const [tab, setTab] = useState("landing");
  const [user, setUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Landing page — no header needed
  if (tab === "landing") {
    return (
      <>
        <FontLoader/>
        <LandingPage onBrowse={() => setTab("browse")} onUrgent={() => setTab("urgent")}/>
      </>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#F7F5F0", fontFamily:"'DM Sans', 'Georgia', sans-serif" }}>
      <FontLoader/>

      {/* Header */}
      <div style={{ background:"#1A1A1A", padding:"0 24px", position:"sticky", top:0, zIndex:100, boxShadow:"0 2px 20px rgba(0,0,0,0.3)" }}>
        <div style={{ maxWidth:1000, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0" }}>
          <button onClick={()=>setTab("landing")} style={{ display:"flex", alignItems:"center", gap:10, background:"none", border:"none", cursor:"pointer", padding:0 }}>
            <LogoIcon size={44}/>
            <span style={{ fontFamily:"'Bebas Neue', 'Georgia', serif", fontSize:26, letterSpacing:"1px", color:"#fff", lineHeight:1 }}>
              Roo<span style={{color:"#C8102E"}}>Finder</span>
            </span>
          </button>

          {/* Tab switcher */}
          <div style={{ display:"flex", gap:4, background:"#2A2A2A", borderRadius:10, padding:4 }}>
            <button onClick={()=>setTab("browse")} style={{ padding:"7px 14px", borderRadius:7, border:"none", background:tab==="browse"?"#fff":"transparent", color:tab==="browse"?"#111":"#9CA3AF", fontSize:12, fontFamily:"sans-serif", fontWeight:tab==="browse"?700:400, cursor:"pointer", whiteSpace:"nowrap" }}>
              👀 Just Browsing
            </button>
            <button onClick={()=>setTab("urgent")} style={{ padding:"7px 14px", borderRadius:7, border:"none", background:tab==="urgent"?"#C8102E":"transparent", color:tab==="urgent"?"#fff":"#9CA3AF", fontSize:12, fontFamily:"sans-serif", fontWeight:tab==="urgent"?700:400, cursor:"pointer", whiteSpace:"nowrap" }}>
              🚨 Need One Today
            </button>
          </div>

          {/* User */}
          <div style={{ position:"relative" }}>
            {user ? (
              <button onClick={()=>setShowUserMenu(!showUserMenu)} style={{ background:"#2A2A2A", border:"1px solid #3A3A3A", borderRadius:20, padding:"7px 14px", color:"#E5E5E5", fontSize:13, fontFamily:"sans-serif", cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:22, height:22, background:"#C8102E", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff" }}>{user.name[0].toUpperCase()}</div>
                {user.name}
              </button>
            ) : (
              <div style={{ width:32 }}/>
            )}
            {showUserMenu && user && (
              <div style={{ position:"absolute", right:0, top:"calc(100% + 8px)", background:"#fff", border:"1px solid #E5E0D8", borderRadius:10, padding:"8px 0", minWidth:180, boxShadow:"0 8px 24px rgba(0,0,0,0.12)", zIndex:200 }}>
                <div style={{ padding:"8px 16px", borderBottom:"1px solid #F0EDE8" }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#111" }}>{user.name}</div>
                  <div style={{ fontSize:12, color:"#9CA3AF", fontFamily:"sans-serif" }}>{user.email}</div>
                </div>
                <button onClick={()=>{setUser(null);setShowUserMenu(false);}} style={{ width:"100%", background:"none", border:"none", padding:"10px 16px", fontSize:13, fontFamily:"sans-serif", color:"#C8102E", cursor:"pointer", textAlign:"left" }}>Sign Out</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab banner */}
      {tab === "urgent" ? (
        <div style={{ background:"linear-gradient(135deg,#7F1D1D 0%,#1A1A1A 100%)", padding:"28px 24px", borderBottom:"3px solid #C8102E" }}>
          <div style={{ maxWidth:480, margin:"0 auto", textAlign:"center" }}>
            <div style={{ fontSize:32, marginBottom:8 }}>🚨</div>
            <h1 style={{ color:"#fff", fontFamily:"'Bebas Neue','Georgia',serif", fontSize:38, letterSpacing:"1px", margin:"0 0 6px", lineHeight:1 }}>Let's Find You Someone Fast</h1>
            <p style={{ color:"#FCA5A5", fontFamily:"'DM Sans',sans-serif", fontSize:14, margin:"0 0 10px" }}>
              Answer 4 quick questions. We match you with the right contractor. <strong>You choose how they contact you.</strong>
            </p>
          </div>
        </div>
      ) : (
        <div style={{ background:"linear-gradient(135deg,#1A1A1A 0%,#2D1515 100%)", padding:"24px 24px", borderBottom:"3px solid #C8102E" }}>
          <div style={{ maxWidth:1000, margin:"0 auto" }}>
            <h1 style={{ color:"#fff", fontFamily:"'Bebas Neue','Georgia',serif", fontSize:36, letterSpacing:"1px", margin:"0 0 4px", lineHeight:1 }}>Find a Trusted Roofer Near You</h1>
            <p style={{ color:"#9CA3AF", fontFamily:"'DM Serif Display',serif", fontStyle:"italic", fontSize:14, margin:0 }}>Browse freely. Contact directly. No middleman.</p>
          </div>
        </div>
      )}

      {/* Content */}
      {tab === "browse"
        ? <BrowseTab user={user} onSignup={setUser} onUrgent={()=>setTab("urgent")}/>
        : <UrgentFlow onBack={()=>setTab("browse")}/>
      }

      <div style={{ textAlign:"center", padding:"32px 24px", color:"#9CA3AF", fontSize:12, fontFamily:"sans-serif", borderTop:"1px solid #E5E0D8" }}>
        RooFinder.online · Browse freely. Contact directly. No middleman.
      </div>
    </div>
  );
}

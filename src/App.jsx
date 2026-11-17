
import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { HeartHandshake, ShieldCheck, Camera, Trophy, Menu, X, ArrowRight, CheckCircle2, FileText, UsersRound, LogOut, UploadCloud, Image as ImageIcon, Video, Play, Instagram, Facebook, Phone } from "lucide-react";
import { auth, db, firebaseReady } from "./firebase";
import { signInWithEmailAndPassword, signOut, getIdToken } from "firebase/auth";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, updateDoc, deleteDoc, doc, where, limit, getDocs, getDoc, writeBatch, setDoc } from "firebase/firestore";

const ADMIN_EMAIL = "rajbabushaikh18@gmail.com";

const money = n => new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:0 }).format(Number(n||0));

const states = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu and Kashmir","Ladakh","Puducherry"];

function useSiteData() {
  const [settings,setSettings] = useState({siteName:"Umeed",tagline:"Together, we can bring hope.",about:"A community-led effort to support families and individuals facing hardship. Every verified contribution is recorded transparently.",upiId:"",upiName:"",qrUrl:"",phone:"",heroImage:"",serviceTitle:"Umeed Community Service",serviceContent:"",totalHelped:"0",goal:"500000",instagramUrl:"",facebookUrl:""});
  const [donations,setDonations] = useState([]);
  const [media,setMedia] = useState([]);

  useEffect(() => {
    if (!db) return;
    const stopA = onSnapshot(doc(db,"site","settings"), s => { if(s.exists()) setSettings(p=>({...p,...s.data()})); });
    const stopB = onSnapshot(
  query(collection(db,"donations"),where("status","==","verified"),limit(100)),
  s => setDonations(s.docs.map(d=>({id:d.id,...d.data()}))),
  err => console.error("Verified donations error:",err)
);
    const stopC = onSnapshot(query(collection(db,"media"),orderBy("createdAt","desc"),limit(50)), s => setMedia(s.docs.map(d=>({id:d.id,...d.data()}))));
    return () => { stopA(); stopB(); stopC(); };
  },[]);

  return {settings,donations,media};
}

function Header({settings}) {
  const [open,setOpen] = useState(false);

  return <header className="header">
    <Link to="/" className="brand"><span className="brandIcon"><HeartHandshake size={22}/></span><span>{settings.siteName || "Umeed"}</span></Link>
    <button className="mobileMenu" onClick={()=>setOpen(!open)} aria-label="Menu">{open?<X/>:<Menu/>}</button>
    <nav className={open?"nav open":"nav"}>
      <Link to="/details" className="navItem" onClick={()=>setOpen(false)}><FileText className="navIcon" size={17}/><span>Donation details</span></Link>
      <Link to="/service" className="navItem" onClick={()=>setOpen(false)}><HeartHandshake className="navIcon" size={17}/><span>Service</span></Link>
      <Link to="/join-community" className="navItem joinNav" onClick={()=>setOpen(false)}><UsersRound className="navIcon" size={17}/><span>Join Community</span></Link>
      <a href="/#leaderboard" className="navItem" onClick={()=>setOpen(false)}><Trophy className="navIcon" size={17}/><span>Leaderboard</span></a>
      <a href="/#gallery" className="navItem" onClick={()=>setOpen(false)}><Camera className="navIcon" size={17}/><span>Stories</span></a>
      <Link className="navDonate" to="/donate" onClick={()=>setOpen(false)}><HeartHandshake size={17}/><span>Donate now</span><ArrowRight size={15}/></Link>
      <Link to="/admin" className="navItem adminLink" onClick={()=>setOpen(false)}><ShieldCheck className="navIcon" size={17}/><span>Community</span></Link>
    </nav>
  </header>;
}

function Home({data}) {
  const {settings,donations,media}=data;
const [now,setNow] = useState(Date.now());
const [impactAmount,setImpactAmount] = useState(50);
const estimatedPeople = Math.round(impactAmount / 25);

useEffect(() => {
  const timer = setInterval(() => setNow(Date.now()), 60 * 1000);
  return () => clearInterval(timer);
}, []);

const top = useMemo(() => [...donations]
  .filter(d => {
    const created = d.createdAt?.toDate
      ? d.createdAt.toDate().getTime()
      : typeof d.createdAt?.seconds === "number"
        ? d.createdAt.seconds * 1000
        : d.createdAt instanceof Date
          ? d.createdAt.getTime()
          : 0;
    return created > 0 && created <= now && now - created < 12 * 60 * 60 * 1000;
  })
  .sort((a,b) => Number(b.amount) - Number(a.amount))
  .slice(0,5), [donations,now]);

  return <>
    <section className="section leaderboard compactLeaderboard" id="leaderboard">
      <div className="sectionHead">
        <div><div className="sectionLabel">COMMUNITY OF GIVERS</div><h2>Daily kindness leaders</h2><p>Top contributions from our community.</p></div>
        <Trophy size={34}/>
      </div>
      <div className="tableWrap"><table>
        <thead><tr><th>Rank</th><th>Donor</th><th>State</th><th>Amount</th><th>Date</th></tr></thead>
        <tbody>{top.length?top.map((d,i)=><tr key={d.id}>
          <td><span className="rank">{i+1}</span></td><td>{d.name}</td><td>{d.state}</td><td className="amount">{money(d.amount)}</td>
          <td>{d.createdAt?.toDate?.().toLocaleDateString("en-IN") || "Recently"}</td>
        </tr>):<tr><td colSpan="5" className="empty">Be the first to make a contribution.</td></tr>}</tbody>
      </table></div>
      
    </section>

    <section className="impactSlider" aria-label="Donation impact calculator">
      <div className="impactSliderHead">
        <div><span className="sectionLabel">YOUR DONATION, YOUR IMPACT</span><h2>See what your help can do</h2></div>
        <div className="impactAmount">{money(impactAmount)}</div>
      </div>
      <input className="impactRange" type="range" min="50" max="5000" step="50" value={impactAmount} onChange={e=>setImpactAmount(Number(e.target.value))} aria-label="Choose donation amount"/>
      <div className="impactRangeLabels"><span>₹50</span><span>₹5,000</span></div>
      <div className="impactEstimate"><span className="impactPeople">{estimatedPeople}</span><span>Itne logon ke chehre par muskaan la sakte hain ❤️</span></div>
    </section>

    <section className="hero">
      <div className="heroCopy">
        <div className="eyebrow"><span/> SMALL ACTS. BIG CHANGE.</div>
        <h1>Be the reason<br/><em>someone smiles.</em></h1>
        <p>{settings.tagline || "Your kindness can help a family take its next step."}</p>
        <div className="heroActions">
          <Link to="/donate" className="primaryBtn">Make a donation <ArrowRight size={18}/></Link>
          <Link to="/details" className="textBtn">Donation details</Link>
        </div>
        
      </div>
      <div className="heroArt">
        <div className="sun"/>
        <div className="heroPhoto"><img src={settings.heroImage || "/umeed-helping-children.png"} alt="Umeed volunteers helping children"/></div>
        <div className="floatingNote"><HeartHandshake size={20}/><span><b>Every contribution</b><small>makes a difference</small></span></div>
      </div>
    </section>

    <section className="section intro">
      <div className="sectionLabel">WHY WE EXIST</div>
      <h2>Kindness has the power<br/>to change a life.</h2>
      <p>{settings.about}</p>
      <Link to="/donate" className="underLink">Be part of the change <ArrowRight size={16}/></Link>
    </section>

    <section className="section gallery" id="gallery">
      <div className="sectionHead">
        <div><div className="sectionLabel">REAL STORIES</div><h2>Moments of hope</h2><p>Explore photos and videos from our community.</p></div>
        <Camera size={32}/>
      </div>
      <div className="mediaChoices">
        <Link to="/photos" className="mediaChoice"><ImageIcon size={30}/><span><b>Photos</b><small>{media.filter(m=>m.type!=="video").length} photos · View gallery</small></span><ArrowRight/></Link>
        <Link to="/videos" className="mediaChoice"><Video size={30}/><span><b>Videos</b><small>{media.filter(m=>m.type==="video").length} videos · Watch stories</small></span><ArrowRight/></Link>
      </div>
    </section>

    <section className="closing">
      <div><div className="sectionLabel">YOUR HELP MATTERS</div><h2>One act of giving<br/>can start a chain of hope.</h2></div>
      <Link to="/donate" className="primaryBtn">Donate today <ArrowRight size={18}/></Link>
    </section>

    <footer>
      <Link to="/" className="brand"><span className="brandIcon"><HeartHandshake size={20}/></span>{settings.siteName || "Umeed"}</Link>
      <span>Built on kindness. Powered by community.</span>
      <div className="socialLinks" aria-label="Social media links">
        {settings.instagramUrl&&<a className="socialLink instagramLink" href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Open Instagram"><Instagram size={23}/><span><b>Instagram</b><small>Instagram open</small></span></a>}
        <Link className="socialLink helplineLink" to="/helpline" aria-label="Open Helpline"><Phone size={23}/><span><b>Helpline</b><small>Get help</small></span></Link>
        {settings.facebookUrl&&<a className="socialLink facebookLink" href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Open Facebook"><Facebook size={23}/><span><b>Facebook</b><small>Facebook open</small></span></a>}
      </div>
    </footer>
  </>;
}


function tryMediaFallback(event,url){
  const media=event.currentTarget;
  const index=Number(media.dataset.fallbackIndex||"0");
  let parsed;
  try{parsed=new URL(url,window.location.origin);}catch{return;}
  const file=parsed.pathname.split("/").filter(Boolean).pop();
  if(!file||index>=3)return;
  const paths=["/umeed/community/","/umeed/umeed/community/","/umeedcommunity/"];
  media.dataset.fallbackIndex=String(index+1);
  const candidate=parsed.origin+paths[index]+file;
  if(candidate!==media.src)media.src=candidate;
}
function MediaPage({media,type}) {
  const [selected,setSelected]=useState(null);
  const mediaUrl = (url) => {
    try {
      const parsed = new URL(url);
      if (parsed.pathname.startsWith("/community/")) parsed.pathname = `/umeed${parsed.pathname}`;
      return parsed.toString();
    } catch {
      return url;
    }
  };
  const items=useMemo(()=>media.filter(m=>type==="video"?m.type==="video":m.type!=="video"),[media,type]);
  const heading=type==="video"?"Videos":"Photos";
  return <main className="mediaPage">
    <div className="mediaPageHead">
      <Link to="/" className="mediaBack">← Back to home</Link>
      <div className="sectionLabel">UMEED COMMUNITY STORIES</div>
      <h1>{heading}</h1>
      <p>{type==="video"?"Watch stories and updates from our community.":"View photos and moments shared by our community."}</p>
      <span className="mediaCount">{items.length} {type==="video"?"videos":"photos"}</span>
    </div>
    <div className="mediaPageGrid">
      {items.length?items.map((m,i)=><article className="mediaPageCard" key={m.id}>
        <button className="mediaPreview" onClick={()=>setSelected(m)} aria-label={type==="video"?"Play video":"View full photo"}>
          {type==="video"?<><video src={mediaUrl(m.url)} onError={e=>tryMediaFallback(e,m.url)} preload="metadata" playsInline/><span className="mediaPlay"><Play fill="currentColor"/></span></>:<img src={mediaUrl(m.url)} onError={e=>tryMediaFallback(e,m.url)} alt={m.title||"Umeed community photo"} loading="lazy"/>}
          <span className="mediaNumber">{String(i+1).padStart(2,"0")}</span>
        </button>
        <div className="mediaPageCaption"><b>{m.title||heading.slice(0,-1)+" "+(i+1)}</b>{m.caption&&<p>{m.caption}</p>}</div>
      </article>):<div className="emptyGallery"><Camera size={30}/><span>No {type==="video"?"videos":"photos"} have been uploaded yet.</span></div>}
    </div>
    {selected&&<div className="mediaLightbox" onClick={()=>setSelected(null)}>
      <button className="mediaClose" onClick={()=>setSelected(null)} aria-label="Close">×</button>
      <div className="mediaLightboxInner" onClick={e=>e.stopPropagation()}>
        {type==="video"?<video src={mediaUrl(selected.url)} onError={e=>tryMediaFallback(e,selected.url)} controls autoPlay playsInline/>:<img src={mediaUrl(selected.url)} onError={e=>tryMediaFallback(e,selected.url)} alt={selected.title||"Full size community photo"}/>}
        <div><b>{selected.title}</b>{selected.caption&&<p>{selected.caption}</p>}</div>
      </div>
    </div>}
  </main>;
}

function DonationDetails({settings,donations}) {
  const total = donations.reduce((sum,d)=>sum+Number(d.amount||0),0);

  return <main className="detailsPage">
    <div className="detailsHeading">
      <div className="sectionLabel">TRANSPARENCY</div>
      <h1>Donation details</h1>
      <p>A clear record of contributions made by our community.</p>
    </div>
    <section className="stats detailsStats" id="impact">
      <div><span>Total donations</span><b>{money(total)}</b></div>
      <div><span>Contributions</span><b>{donations.length}</b></div>
      <div><span>People Helped Together ❤️</span><b>{settings.totalHelped || "0"}+</b></div>
      <div><span>Our promise</span><b>Transparent giving</b></div>
    </section>
    <section className="section detailsList">
      <div className="sectionHead">
        <div><div className="sectionLabel">COMMUNITY RECORD</div><h2>All contributions</h2></div>
        <ShieldCheck size={28}/>
      </div>
      <div className="tableWrap"><table>
        <thead><tr><th>Donor</th><th>State</th><th>Amount</th><th>Date</th></tr></thead>
        <tbody>{donations.length ? donations.map(d=><tr key={d.id}>
          <td>{d.name}</td><td>{d.state}</td><td className="amount">{money(d.amount)}</td>
          <td>{d.createdAt?.toDate?.().toLocaleDateString("en-IN") || "Recently"}</td>
        </tr>) : <tr><td colSpan="4" className="empty">Verified donations will appear here.</td></tr>}</tbody>
      </table></div>
      
    </section>
  </main>;
}

function CommunityService({settings}) {
  const content = settings.serviceContent || "";
  return <main className="servicePage">
    <div className="serviceHero">
      <div className="sectionLabel">UMEED COMMUNITY</div>
      <h1>{settings.serviceTitle || "Umeed Community Service"}</h1>
      <p>Our community, our work, and the ways we bring hope together.</p>
    </div>
    <section className="serviceContent">
      {content.trim() ? <div className="serviceText">{content}</div> : <div className="serviceEmpty">Community service information will be added soon.</div>}
    </section>
  </main>;
}



function HelpLine() {
  const [form,setForm]=useState({message:"",address:"",mobile:""});
  const [busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState("");
  async function submit(e){
    e.preventDefault();setError("");
    if(!db){setError("Helpline abhi available nahi hai.");return;}
    if(!/^[6-9][0-9]{9}$/.test(form.mobile.trim())){setError("Valid 10-digit mobile number enter karein.");return;}
    if(form.message.trim().length<8){setError("Please help ke baare mein thoda detail mein likhein.");return;}
    if(form.address.trim().length<5){setError("Apna poora address enter karein.");return;}
    setBusy(true);
    try{
      await addDoc(collection(db,"helpRequests"),{
        message:form.message.trim(),address:form.address.trim(),mobile:form.mobile.trim(),
        status:"new",createdAt:serverTimestamp()
      });
      setDone(true);
    }catch(err){setError(err.message||"Helpline request submit nahi hui. Dobara try karein.");}
    finally{setBusy(false);}
  }
  return <main className="joinPage helpLinePage">
    <section className="joinHero"><span className="sectionLabel">UMEED COMMUNITY SUPPORT</span><h1>Helpline</h1><p>Batayein aapko kis cheez mein madad chahiye. Hamari team aapse sampark karegi.</p></section>
    {done?<section className="joinSuccess"><div className="joinSuccessIcon">✓</div><h2>Your request has been submitted</h2><p>Thank you for contacting Umeed Community. Hamari community team 48 hours ke andar aapse contact karne ki koshish karegi.</p></section>:<section className="helpFormPanel">
      <form className="settingsForm" onSubmit={submit}>
        <label>Kis cheez ke liye help chahiye?<textarea rows="5" maxLength="1500" value={form.message} onChange={e=>setForm(p=>({...p,message:e.target.value}))} placeholder="Apni problem ya help ki zaroorat detail mein likhein..." required/></label>
        <label>Poora address<textarea rows="3" maxLength="500" value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} placeholder="House / area / city / pincode" required/></label>
        <label>Mobile number<input type="tel" inputMode="numeric" maxLength="10" value={form.mobile} onChange={e=>setForm(p=>({...p,mobile:e.target.value.replace(/[^0-9]/g,"").slice(0,10)}))} placeholder="10-digit mobile number" required/></label>
        {error&&<p className="error">{error}</p>}
        <button className="primaryBtn" disabled={busy}>{busy?"Submitting…":"Submit Helpline Request"}</button>
      </form>
    </section>}
  </main>;
}

function JoinCommunity() {
  const [form,setForm]=useState({name:"",email:"",mobile:"",state:"",age:""});
  const [busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState(""),[joinId,setJoinId]=useState("");
  const change=e=>setForm(p=>({...p,[e.target.name]:e.target.value}));
  async function submit(e){
    e.preventDefault();setError("");
    if(!db){setError("Joining service abhi available nahi hai.");return;}
    if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(form.email.trim())){setError("Valid Gmail / email address enter karein.");return;}
    if(!/^[6-9]\\d{9}$/.test(form.mobile)){setError("Valid 10-digit mobile number enter karein.");return;}
    if(Number(form.age)<18||Number(form.age)>100){setError("Joining ke liye age 18 se 100 ke beech honi chahiye.");return;}
    setBusy(true);
    try{
      const requestRef=doc(collection(db,"communityJoins"));
      await setDoc(requestRef,{
        name:form.name.trim(),email:form.email.trim().toLowerCase(),mobile:form.mobile.trim(),state:form.state,age:Number(form.age),
        status:"pending",createdAt:serverTimestamp(),termsAccepted:true
      });
      setJoinId(requestRef.id);setDone(true);
    }catch(err){setError(err.message||"Request submit nahi hui. Dobara try karein.");}
    finally{setBusy(false);}
  }
  return <main className="joinPage">
    <section className="joinHero"><span className="sectionLabel">BE A PART OF THE CHANGE</span><h1>Join Umeed Community</h1><p>Apni skills aur mehnat se kamayein, aur community ke zariye zarooratmand logon ki madad ka hissa banein.</p></section>
    {done?<section className="joinSuccess"><div className="joinSuccessIcon">✓</div><h2>Thank you for joining Umeed Community!</h2><p>Aapki joining request successfully submit ho gayi hai. Admin aapki details check karke joining approve karega.</p><small>Joining Request ID: {joinId}</small><div className="joinPendingStamp">PENDING ADMIN APPROVAL</div><button className="primaryBtn" onClick={()=>window.print()}>Download joining receipt / PDF</button></section>:<>
      <section className="joinInfoGrid">
        <article><h2>Joining Rules</h2><ul>
          <li>Member ki identity verification ke liye Aadhaar Card, PAN Card aur passport-size photo dena zaroori hoga.</li>
          <li>Mobile number aur di gayi personal details sahi honi chahiye.</li>
          <li>Joining request admin review ke baad hi approve hogi.</li>
          <li>Community ke through earning shuru karne se pehle applicable work aur payment details clear ki jayengi.</li>
        </ul></article>
        <article><h2>Community Benefits</h2><ul>
          <li>Umeed Community ke network ke through kaam aur earning ke mauke.</li>
          <li>Har earning ka transparent record maintain kiya jayega.</li>
          <li>Community ke social-help projects ka hissa banne ka mauka.</li>
        </ul><div className="joinShare"><b>75% Community</b><span>25% Referring Member</span></div></article>
      </section>
      <section className="joinFormCard"><h2>Join Community Form</h2><p>Form submit karne ke baad admin approval ka wait karein.</p>
        <form onSubmit={submit}>
          <label>Full name<input name="name" value={form.name} onChange={change} maxLength="80" required placeholder="Apna poora naam"/></label>
          <label>Gmail / Email address<input name="email" type="email" autoComplete="email" value={form.email} onChange={change} required placeholder="example@gmail.com"/></label>
          <label>Mobile number<input name="mobile" type="tel" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength="10" value={form.mobile} onChange={e=>setForm(p=>({...p,mobile:e.target.value.replace(/\\D/g,"").slice(0,10)}))} required placeholder="10-digit mobile number"/></label>
          <label>State<select name="state" value={form.state} onChange={change} required><option value="">Select state</option>{states.map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Age<input name="age" type="number" min="18" max="100" value={form.age} onChange={change} required placeholder="Your age"/></label>
          {error&&<p className="error">{error}</p>}
          <button className="primaryBtn" disabled={busy}>{busy?"Submitting…":"Join Community"}</button>
        </form>
      </section>
    </>}
  </main>;
}

function Donate({settings}) {
  const [form,setForm]=useState({name:"",state:"",amount:"",transactionId:"",note:""});
  const referralCode=new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase()||"";
  const [referralMemberName,setReferralMemberName]=useState("");
  useEffect(()=>{let active=true;if(!db||!referralCode)return;getDoc(doc(db,"referralCodes",referralCode)).then(s=>{if(active&&s.exists())setReferralMemberName(s.data().memberName||"Umeed Community Member");}).catch(()=>{});return()=>{active=false;};},[referralCode]);
  const [busy,setBusy]=useState(false),[done,setDone]=useState(()=>Boolean(localStorage.getItem("umeedLastDonationId"))),[error,setError]=useState("");
  const [submittedId,setSubmittedId]=useState(()=>localStorage.getItem("umeedLastDonationId")||"");
  const [certificateCode,setCertificateCode]=useState(()=>localStorage.getItem("umeedLastCertificateCode")||"");
  const [donationRecord,setDonationRecord]=useState(()=>{
    try{return JSON.parse(localStorage.getItem("umeedLastDonationPreview")||"null");}catch{return null;}
  });
  const [lookupCode,setLookupCode]=useState("");
  const [lookupRecord,setLookupRecord]=useState(null);
  const [lookupBusy,setLookupBusy]=useState(false);
  const [lookupMessage,setLookupMessage]=useState("");
  const [showCertificate,setShowCertificate]=useState(false);

  useEffect(()=>{
    if(!db||!certificateCode)return;
    const verifiedQuery=query(collection(db,"donations"),where("certificateCode","==",certificateCode),where("status","==","verified"),limit(1));
    return onSnapshot(verifiedQuery,snap=>{
      if(!snap.empty){
        const d={id:snap.docs[0].id,...snap.docs[0].data()};
        setDonationRecord(d);
        localStorage.setItem("umeedLastDonationPreview",JSON.stringify({...d,createdAt:null}));
      }
    },err=>console.error("Certificate status check:",err));
  },[certificateCode]);

  function downloadCertificate(record){
    setShowCertificate(true);
    setTimeout(()=>window.print(),400);
  }

  function startNewDonation(){
    setForm({name:"",state:"",amount:"",transactionId:"",note:""});
    setDone(false);
    setSubmittedId("");
    setCertificateCode("");
    setDonationRecord(null);
    setLookupRecord(null);
    setLookupCode("");
    setLookupMessage("");
    setShowCertificate(false);
    localStorage.removeItem("umeedLastDonationId");
    localStorage.removeItem("umeedLastCertificateCode");
    localStorage.removeItem("umeedLastDonationPreview");
    setError("");
    window.scrollTo({top:0,behavior:"smooth"});
  }
  const change=e=>setForm(p=>({...p,[e.target.name]:e.target.value}));

  async function lookupCertificate(e){
    e?.preventDefault();
    const code=lookupCode.trim();
    setLookupMessage("");setLookupRecord(null);
    if(!/^\d{6}$/.test(code)){setLookupMessage("Please 6-digit Certificate Number enter karein.");return;}
    if(!db){setLookupMessage("Certificate service abhi available nahi hai.");return;}
    setLookupBusy(true);
    try{
      const codeSnap=await getDoc(doc(db,"certificateCodes",code));
      if(!codeSnap.exists())setLookupMessage("Certificate abhi verify nahi hua hai ya number galat hai. Payment verify hone ke baad dobara try karein.");
      else{
        const donationSnap=await getDoc(doc(db,"donations",codeSnap.data().donationId));
        if(!donationSnap.exists())setLookupMessage("Certificate record nahi mila.");
        else setLookupRecord({id:donationSnap.id,...donationSnap.data()});
      }
    }catch(err){setLookupMessage("Certificate check nahi ho paya. Thodi der baad try karein.");}
    finally{setLookupBusy(false);}
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if(!db){setError("Firebase is not configured yet. Please try again after setup.");return;}
    if(Number(form.amount)<1){setError("Please enter a valid donation amount.");return;}
    setBusy(true);
    try {
      let validReferralCode="";
      if(referralCode){const referralSnap=await getDoc(doc(db,"referralCodes",referralCode));if(referralSnap.exists())validReferralCode=referralCode;}
      let newCode="",docRef=null,lastError=null;
      // Generate an unbiased random 6-digit code. Firestore rules atomically
      // reject a code that already exists, so a collision can never overwrite it.
      function makeUniqueCandidate(){
        const range=900000;
        const limit=Math.floor(0x100000000/range)*range;
        const value=new Uint32Array(1);
        do{crypto.getRandomValues(value);}while(value[0]>=limit);
        return String(100000+(value[0]%range));
      }
      for(let attempt=0;attempt<20;attempt++){
        newCode=makeUniqueCandidate();
        docRef=doc(collection(db,"donations"));
        const batch=writeBatch(db);
        batch.set(docRef,{
          name:form.name.trim(),state:form.state,amount:Number(form.amount),
          transactionId:form.transactionId.trim(),note:form.note.trim(),
          ...(referralCode?{referralCode}:{}),
          certificateCode:newCode,status:"pending",createdAt:serverTimestamp()
        });
        // This mapping is create-only in Firestore rules; existing numbers cannot be reused.
        batch.set(doc(db,"certificateCodes",newCode),{donationId:docRef.id});
        try{await batch.commit();lastError=null;break;}catch(err){lastError=err;docRef=null;}
      }
      if(!docRef)throw lastError||new Error("Unique number reserve nahi ho paya. Please dobara try karein.");
      const preview={name:form.name.trim(),state:form.state,amount:Number(form.amount),status:"pending",certificateCode:newCode,createdAt:new Date().toISOString()};
      setSubmittedId(docRef.id);
      setCertificateCode(newCode);
      setDonationRecord({...preview,id:docRef.id});
      localStorage.setItem("umeedLastDonationId",docRef.id);
      localStorage.setItem("umeedLastCertificateCode",newCode);
      localStorage.setItem("umeedLastDonationPreview",JSON.stringify(preview));
      setDone(true);
    } catch(err) {
      setError(err.message||"Could not submit donation.");
    } finally {
      setBusy(false);
    }
  }

  const renderCertificate=(record,preview=false)=> {
    const verified=record?.status==="verified";
    const certDate=record?.createdAt?.toDate
      ?record.createdAt.toDate().toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"})
      :new Date(record?.createdAt||Date.now()).toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"});
    return <section className={"donationCertificate"+(showCertificate?" printReady":"")}>
      <div className="certificateBorder">
        <div className="certificateLogo"><span className="brandIcon"><HeartHandshake size={30}/></span><b>UMEED COMMUNITY</b></div>
        <div className="certificateSmall">CERTIFICATE OF APPRECIATION</div>
        <h1>Donation Certificate</h1>
        <p className="certificateIntro">This certificate is proudly presented to</p>
        <h2>{record?.name||"Valued Donor"}</h2>
        <p className="certificateBody">In heartfelt appreciation of your generous contribution to Umeed Community. Your kindness and support help us bring hope, care and smiles to people in need.</p>
        <div className="certificateDetails">
          <div><span>DONATION AMOUNT</span><b>{money(record?.amount)}</b></div>
          <div><span>STATE</span><b>{record?.state||"—"}</b></div>
          <div><span>DATE</span><b>{certDate}</b></div>
        </div>
        <div className="certificateCodeLine"><span>YOUR 6-DIGIT CERTIFICATE NUMBER</span><b>{record?.certificateCode||"------"}</b></div>
        <p className="certificateThanks">Thank you for being a part of this journey of kindness. Every act of giving makes a difference. We are truly grateful to have you with us. ❤️</p>
        <div className="certificateFooter">
          <div className="certificateSignature"><span>{verified?"With gratitude,":"Signature after payment verification"}</span>{verified?<><img src="data:image/png;base64,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" alt="Umeed Community handwritten signature" style={{display:"block",width:"170px",maxWidth:"100%",height:"auto",margin:"5px 0 2px",background:"#fff"}}/><small>Umeed Community</small></>:<><b>Pending Verification</b><small>Official signature will appear after verification</small></>}</div>
          <div className="certificateId"><span>CERTIFICATE NUMBER</span><b>{record?.certificateCode||"------"}</b></div>
        </div>
        <div className="certificateMotto">Jahan Madad Hai, Wahan Umeed Hai.</div>
        {!verified&&<div className="certificatePendingStamp">PENDING PAYMENT VERIFICATION · NOT VALID FOR OFFICIAL USE</div>}
      </div>
    </section>;
  };

  return <main className="formPage certificatePage">
    {done&&donationRecord&&<div className="successCard noPrint">
      <CheckCircle2 size={48}/><h1>{donationRecord.status==="verified"?"Your donation is verified!":"Thank you for your kindness."}</h1>
      <p>{donationRecord.status==="verified"?"Your contribution has been verified. Your official certificate is ready.":"Your certificate preview is ready. Official signature and PDF download will unlock after payment verification."}</p>
      <div className="donorCertificateNumber"><span>Your Certificate Number</span><b>{donationRecord.certificateCode||certificateCode}</b><small>Is 6-digit number ko save kar lein. Baad mein isi se certificate check/download kar sakte hain.</small></div>
      {donationRecord.status==="verified"&&<button className="primaryBtn full" onClick={()=>downloadCertificate(donationRecord)}>Download Official Certificate (PDF)</button>}
      <Link to="/" className="textBtn">Back to home</Link>
      <button type="button" className="primaryBtn full" onClick={startNewDonation}>＋ Make a new donation</button>
    </div>}
    {done&&donationRecord&&renderCertificate(donationRecord,true)}
    {lookupRecord&&<div className="successCard noPrint">
      <CheckCircle2 size={38}/><h2>Verified certificate found!</h2>
      <p>Certificate Number: <b>{lookupRecord.certificateCode}</b></p>
      <button className="primaryBtn full" onClick={()=>downloadCertificate(lookupRecord)}>Download Official Certificate (PDF)</button>
    </div>}
    {lookupRecord&&renderCertificate(lookupRecord)}
    {!done&&<div className="formIntro">
      <div className="sectionLabel">GIVE WITH PURPOSE</div>
      {referralCode&&<p className="referralAttribution">You are donating through <b>{referralMemberName||"Umeed Community Member"}</b></p>}
      <h1>Your kindness<br/><em>creates hope.</em></h1>
      <p>Fill in your details, make the payment using the payment details shown below, then submit your donation details. Transaction reference dena optional hai.</p>
    </div>}
    {!done&&<form className="donateForm" onSubmit={submit}>
      <h2>Donation details</h2>
      <label>Your full name<input name="name" required maxLength="80" value={form.name} onChange={change} placeholder="Enter your name"/></label>
      <label>State<select name="state" required value={form.state} onChange={change}>
        <option value="">Select your state</option>{states.map(s=><option key={s}>{s}</option>)}
      </select></label>
      <label>Donation amount (₹)<input name="amount" required type="number" min="1" max="10000000" value={form.amount} onChange={change} placeholder="e.g. 500"/></label>
      <div className="paymentBox">
        <b>Make your payment</b>
        {settings.qrUrl?<img className="qr" src={settings.qrUrl} alt="Donation payment QR code"/>:<div className="qrMissing">Payment QR code is not available yet.</div>}
        {settings.upiId&&<p>UPI ID: <b>{settings.upiId}</b></p>}
        {settings.upiName&&<p>Payee: {settings.upiName}</p>}
        {settings.phone&&<p>UPI / Mobile: {settings.phone}</p>}
        <small>Yeh QR code hamari Community ke Main Member ka hai. Kripya donation sirf isi QR code ko scan karke karein.</small>
      </div>
      <label>UPI transaction ID / reference (optional)<input name="transactionId" value={form.transactionId} onChange={change} placeholder="Agar pata ho to yahan likhein"/></label>
      <label>Message (optional)<textarea name="note" rows="3" maxLength="300" value={form.note} onChange={change} placeholder="A short message"/></label>
      {error&&<p className="error">{error}</p>}
      <button className="primaryBtn full" disabled={busy}>{busy?"Submitting…":"Submit donation"}</button>
      <p className="formFine">Please enter your correct payment reference. Do not submit someone else's transaction details.</p>
    </form>}
    <section className="certificateLookup noPrint">
      <h2>Already donated? Find your certificate</h2>
      <p>Apna 6-digit Certificate Number enter karke verified PDF download karein.</p>
      <form onSubmit={lookupCertificate}>
        <input inputMode="numeric" maxLength="6" pattern="[0-9]{6}" value={lookupCode} onChange={e=>setLookupCode(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="Enter 6-digit number" aria-label="6-digit Certificate Number"/>
        <button className="primaryBtn" disabled={lookupBusy}>{lookupBusy?"Checking…":"Check Certificate"}</button>
      </form>
      {lookupMessage&&<p className="formFine">{lookupMessage}</p>}
    </section>
  </main>;
}

function Admin({settings}) {
  const [user,setUser]=useState(auth?.currentUser||null);
  const [isAdmin,setIsAdmin]=useState(false);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [tab,setTab]=useState("overview");
  const [pending,setPending]=useState([]);
  const [joinRequests,setJoinRequests]=useState([]);
  const [helpRequests,setHelpRequests]=useState([]);
  const [selectedJoin,setSelectedJoin]=useState(null);
  const [memberPayments,setMemberPayments]=useState([]);
  const [selectedPaymentMember,setSelectedPaymentMember]=useState(null);
  const [paymentForm,setPaymentForm]=useState({amount:"",paidAt:"",referenceId:""});
  const [paymentReportMonth,setPaymentReportMonth]=useState(()=>new Date().toISOString().slice(0,7));
  const [form,setForm]=useState(settings);
  const [mediaTitle,setMediaTitle]=useState("");
  const [mediaCaption,setMediaCaption]=useState("");
  const [mediaType,setMediaType]=useState("image");
  const [file,setFile]=useState(null);
  const [uploading,setUploading]=useState(false);
  const [mediaItems,setMediaItems]=useState([]);
  const [editingMedia,setEditingMedia]=useState(null);
  const [editTitle,setEditTitle]=useState("");
  const [editCaption,setEditCaption]=useState("");
  const [replacementFile,setReplacementFile]=useState(null);
  const [mediaBusy,setMediaBusy]=useState(false);

  useEffect(()=>{
    if(!auth)return;
    return auth.onAuthStateChanged(async u=>{
      if(!u){setUser(null);setIsAdmin(false);return;}
      try {
        await u.reload();
        await getIdToken(u,true);
        const freshUser=auth.currentUser;
        setUser(freshUser);
        setIsAdmin(Boolean(
          freshUser?.emailVerified &&
          freshUser.email?.toLowerCase()===ADMIN_EMAIL
        ));
      } catch(err) {
        console.error("Admin verification error:",err);
        setUser(u);
        setIsAdmin(false);
      }
    });
  },[]);

  useEffect(()=>{
    if(!db||!user||!isAdmin)return;
    return onSnapshot(
      query(collection(db,"donations"),orderBy("createdAt","desc"),limit(1000)),
      s=>setPending(s.docs.map(d=>({id:d.id,...d.data()}))),
      err=>setError(err.message)
    );
  },[user,isAdmin]);

  useEffect(()=>{
    if(!db||!user||!isAdmin)return;
    return onSnapshot(
      query(collection(db,"helpRequests"),orderBy("createdAt","desc"),limit(500)),
      snap=>setHelpRequests(snap.docs.map(d=>({id:d.id,...d.data()}))),
      err=>setError("Helpline requests load error: "+err.message)
    );
  },[user,isAdmin]);

  useEffect(()=>setForm(settings),[settings]);

  useEffect(()=>{
    if(!db||!user||!isAdmin)return;
    return onSnapshot(
      query(collection(db,"communityJoins"),orderBy("createdAt","desc"),limit(250)),
      s=>setJoinRequests(s.docs.map(d=>({id:d.id,...d.data()}))),
      err=>setError("Community Join load error: "+err.message)
    );
  },[user,isAdmin]);

  useEffect(()=>{
    if(!db||!user||!isAdmin)return;
    return onSnapshot(query(collection(db,"media"),orderBy("createdAt","desc"),limit(100)),s=>setMediaItems(s.docs.map(d=>({id:d.id,...d.data()}))),err=>setError(err.message));
  },[user,isAdmin]);

  useEffect(()=>{
    if(!db||!user||!isAdmin)return;
    return onSnapshot(query(collection(db,"memberPayments"),orderBy("paidAt","desc"),limit(1000)),
      s=>setMemberPayments(s.docs.map(d=>({id:d.id,...d.data()}))),
      err=>setError("Member payment records load nahi hue: "+err.message)
    );
  },[user,isAdmin]);

  async function login(e) {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmailAndPassword(auth,email,password);
    } catch(err) {
      setError("Login failed. Check your email and password.");
    }
  }

  async function saveSettings(e) {
    e.preventDefault();
    try {
      await updateDoc(doc(db,"site","settings"),{...form,updatedAt:serverTimestamp()});
      alert("Settings saved.");
    } catch(e) {
      try {
        const {setDoc}=await import("firebase/firestore");
        await setDoc(doc(db,"site","settings"),{...form,updatedAt:serverTimestamp()},{merge:true});
        alert("Settings saved.");
      } catch(err) {
        setError(err.message);
      }
    }
  }

  async function reviewJoin(d,approved){
    if(approved){
      const referralCode=d.referralCode||("UM"+d.id.replace(/[^a-z0-9]/gi,"").toUpperCase());
      await setDoc(doc(db,"referralCodes",referralCode),{memberUid:d.id,memberName:d.name||"Umeed Community Member",createdAt:serverTimestamp()},{merge:true});
      await updateDoc(doc(db,"communityJoins",d.id),{status:"approved",referralCode,reviewedAt:serverTimestamp(),reviewedBy:user.email});
    }else{
      await updateDoc(doc(db,"communityJoins",d.id),{status:"rejected",reviewedAt:serverTimestamp(),reviewedBy:user.email});
    }
  }

  async function saveMemberPayment(e){
    e.preventDefault();setError("");
    if(!selectedPaymentMember){setError("Pehle member select karein.");return;}
    if(!(Number(paymentForm.amount)>0)){setError("Valid payment amount enter karein.");return;}
    if(!paymentForm.paidAt){setError("Payment ki date aur time select karein.");return;}
    if(!paymentForm.referenceId.trim()){setError("Payment reference ID enter karein.");return;}
    try{
      await addDoc(collection(db,"memberPayments"),{
        memberId:selectedPaymentMember.id,
        memberName:selectedPaymentMember.name||"",
        amount:Number(paymentForm.amount),
        paidAt:paymentForm.paidAt,
        referenceId:paymentForm.referenceId.trim(),
        createdAt:serverTimestamp(),
        enteredBy:user.email
      });
      setPaymentForm({amount:"",paidAt:"",referenceId:""});
      alert("Member payment entry save ho gayi.");
    }catch(err){setError(err.message||"Payment entry save nahi hui.");}
  }

  async function markMemberLeft(member){
    if(member.status==="left")return;
    const ok=window.confirm(`${member.name||"Ye member"} ko Left mark karna hai? Naam aur purani payment history rahegi, lekin nayi payment entry ka option band ho jayega.`);
    if(!ok)return;
    try{
      await updateDoc(doc(db,"communityJoins",member.id),{status:"left",leftAt:serverTimestamp(),leftMarkedBy:user.email});
      if(selectedPaymentMember?.id===member.id)setSelectedPaymentMember({...member,status:"left"});
      alert("Member ko Left mark kar diya. Purana record safe hai.");
    }catch(err){setError(err.message||"Member status update nahi hua.");}
  }

  function memberPaymentTotal(memberId){
    return memberPayments.filter(p=>p.memberId===memberId).reduce((sum,p)=>sum+Number(p.amount||0),0);
  }

  function donationMonthKey(d){
    const date=d.createdAt?.toDate?d.createdAt.toDate():d.createdAt?.seconds?new Date(d.createdAt.seconds*1000):new Date(d.createdAt||0);
    return Number.isNaN(date.getTime())?"":date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0");
  }

  const selectedMonthPayments=selectedPaymentMember
    ?memberPayments.filter(p=>p.memberId===selectedPaymentMember.id&&String(p.paidAt||"").slice(0,7)===paymentReportMonth)
      .sort((a,b)=>String(a.paidAt||"").localeCompare(String(b.paidAt||"")))
    :[];
  const selectedMonthTotal=selectedMonthPayments.reduce((sum,p)=>sum+Number(p.amount||0),0);
  const communityShare=Math.round(selectedMonthTotal*0.75*100)/100;
  const memberShare=Math.round(selectedMonthTotal*0.25*100)/100;
  const reportMonthLabel=new Date(paymentReportMonth+"-01T00:00:00").toLocaleDateString("en-IN",{month:"long",year:"numeric"});

  async function verify(d,approved) {
    await updateDoc(doc(db,"donations",d.id),{
      status:approved?"verified":"rejected",
      reviewedAt:serverTimestamp(),
      reviewedBy:user.email
    });
  }

  async function removeDonation(d) {
    const ok=window.confirm(`Kya aap ${d.name||"is donor"} ka donation record permanently delete karna chahte hain? Ye All Contributions se bhi hat jayega.`);
    if(!ok)return;
    setError("");
    try {
      await deleteDoc(doc(db,"donations",d.id));
      // Keep certificateCodes permanently reserved so a deleted 6-digit number is never reused.
      alert("Donor record delete ho gaya. All Contributions se bhi hat gaya.");
    } catch(err) {
      setError(err.message||"Donor delete nahi ho paya.");
    }
  }

  async function uploadMedia(e) {
    e.preventDefault();
    if(!file)return;
    setUploading(true);
    setError("");
    try {
      const token=await getIdToken(user);
      const res=await fetch("/api/r2-presign",{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},
        body:JSON.stringify({fileName:file.name,contentType:file.type})
      });
      if(!res.ok)throw new Error("R2 upload is not configured or upload URL could not be created.");
      const {uploadUrl,publicUrl,key}=await res.json();
      const put=await fetch(uploadUrl,{method:"PUT",headers:{"Content-Type":file.type},body:file});
      if(!put.ok)throw new Error("Upload failed.");
      await addDoc(collection(db,"media"),{
        title:mediaTitle,caption:mediaCaption,type:mediaType,url:publicUrl,key,createdAt:serverTimestamp()
      });
      setFile(null);
      setMediaTitle("");
      setMediaCaption("");
      alert("Media uploaded.");
    } catch(err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function adminMediaUrl(url){
    try{
      const parsed=new URL(url,window.location.origin);
      if(parsed.pathname.startsWith("/community/"))parsed.pathname="/umeed"+parsed.pathname;
      return parsed.toString();
    }catch{return url||"";}
  }

  function getMediaKey(item){
    if(item.key)return item.key;
    try{
      const rawPath=decodeURIComponent(new URL(item.url).pathname);
      const path=rawPath.startsWith("/")?rawPath.slice(1):rawPath;
      if(path.startsWith("umeed/umeed/community/"))return path;
      if(path.startsWith("umeed/community/"))return path;
      if(path.startsWith("umeedcommunity/"))return path;
      return "";
    }catch{return "";}
  }

  async function callMediaDelete(key){
    if(!key)throw new Error("Is purani file ka R2 key nahi mila. File ko delete nahi kiya gaya.");
    const token=await getIdToken(user);
    const res=await fetch("/api/r2-presign",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},body:JSON.stringify({action:"delete",key})});
    if(!res.ok){const data=await res.json().catch(()=>({}));throw new Error(data.error||"R2 file delete nahi hui.");}
  }

  async function saveMediaEdit(item){
    setMediaBusy(true);setError("");
    try{
      let newUrl=item.url,newKey=item.key||getMediaKey(item);
      if(replacementFile){
        const token=await getIdToken(user);
        const res=await fetch("/api/r2-presign",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},body:JSON.stringify({fileName:replacementFile.name,contentType:replacementFile.type})});
        if(!res.ok)throw new Error("Nayi file ke liye upload URL nahi bana.");
        const signed=await res.json();
        const put=await fetch(signed.uploadUrl,{method:"PUT",headers:{"Content-Type":replacementFile.type},body:replacementFile});
        if(!put.ok)throw new Error("Nayi file upload nahi hui.");
        newUrl=signed.publicUrl;newKey=signed.key;
      }
      await updateDoc(doc(db,"media",item.id),{title:editTitle.trim(),caption:editCaption.trim(),url:newUrl,key:newKey,updatedAt:serverTimestamp()});
      if(replacementFile){
        const oldKey=item.key||getMediaKey(item);
        if(oldKey&&oldKey!==newKey){try{await callMediaDelete(oldKey);}catch(err){console.warn("Old media cleanup failed:",err);}}
      }
      setEditingMedia(null);setReplacementFile(null);alert("Photo/video update ho gaya.");
    }catch(err){setError(err.message||"Media update nahi hua.");}
    finally{setMediaBusy(false);}
  }

  async function removeMedia(item){
    if(!window.confirm("Kya aap is photo/video ko permanently delete karna chahte hain?"))return;
    setMediaBusy(true);setError("");
    try{
      await callMediaDelete(item.key||getMediaKey(item));
      await deleteDoc(doc(db,"media",item.id));
      if(editingMedia===item.id)setEditingMedia(null);
      alert("Photo/video delete ho gaya.");
    }catch(err){setError(err.message||"Delete nahi hua.");}
    finally{setMediaBusy(false);}
  }

  if(!firebaseReady)return <main className="adminPage"><div className="adminLogin">
    <h1>Admin setup needed</h1>
    <p>Add Firebase configuration to your Vercel environment variables and local .env file first.</p>
    <Link to="/" className="textBtn">Back to website</Link>
  </div></main>;

  if(!user)return <main className="adminPage"><form className="adminLogin" onSubmit={login}>
    <div className="brandIcon"><ShieldCheck/></div>
    <h1>Admin sign in</h1><p>Authorized administrators only.</p>
    <label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
    <label>Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
    {error&&<p className="error">{error}</p>}
    <button className="primaryBtn full">Sign in securely</button>
    <Link to="/" className="textBtn">Back to website</Link>
  </form></main>;

    if(!isAdmin)return <main className="adminPage"><div className="adminLogin">
    <div className="brandIcon"><ShieldCheck/></div>
    <h1>Email verification required</h1>
    <p>Your email address is correct, but Firebase shows it is not verified yet.</p>
    <p>Login email: {user.email}</p>
    <button className="primaryBtn full" onClick={async()=>{
      try {
        await sendEmailVerification(user);
        alert("Verification email sent. Check your inbox.");
      } catch(err) {
        alert(err.message);
      }
    }}>Resend verification email</button>
    <button className="textBtn" onClick={async()=>{
      await user.reload();
      window.location.reload();
    }}>I have verified — refresh status</button>
    <button className="textBtn" onClick={()=>signOut(auth)}>Sign out</button>
  </div></main>;

  const nav=[["overview","Overview"],["donations","Donations"],["communityJoins","Community Join"],["memberPayments","Member Payments"],["helpline","Helpline"],["settings","Website settings"],["service","Community service"],["media","Photos & videos"]];

  return <main className="adminShell">
    <aside className="adminSide">
      <Link to="/" className="brand"><span className="brandIcon"><HeartHandshake/></span> Umeed Admin</Link>
      <div className="adminNav">{nav.map(([id,label])=><button className={tab===id?"selected":""} key={id} onClick={()=>setTab(id)}>{label}</button>)}</div>
      <button className="logout" onClick={()=>signOut(auth)}><LogOut size={16}/> Sign out</button>
    </aside>
    <section className="adminMain">
      <div className="adminTop">
        <div><div className="sectionLabel">CONTROL CENTRE</div><h1>{nav.find(x=>x[0]===tab)?.[1]}</h1></div>
        <span className="adminEmail">{user.email}</span>
      </div>

      {tab==="overview"&&<div className="adminCards">
        <article><span>All submissions</span><b>{pending.length}</b></article>
        <article><span>Pending verification</span><b>{pending.filter(d=>d.status==="pending").length}</b></article>
        <article><span>Verified donations</span><b>{pending.filter(d=>d.status==="verified").length}</b></article>
        <article><span>Verified amount</span><b>{money(pending.filter(d=>d.status==="verified").reduce((s,d)=>s+Number(d.amount||0),0))}</b></article>
      </div>}

      {tab==="donations"&&<div className="adminPanel">
        <h2>Donation submissions</h2>
        <div className="tableWrap"><table>
          <thead><tr><th>Donor</th><th>State</th><th>Amount</th><th>Transaction ID</th><th>Unique Number</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>{pending.map(d=><tr key={d.id}>
            <td>{d.name}</td><td>{d.state}</td><td>{money(d.amount)}</td><td>{d.transactionId}</td><td><b>{d.certificateCode||"—"}</b></td>
            <td><span className={"status "+d.status}>{d.status}</span></td>
            <td><div className="actions">
              {d.status==="pending"&&<><button onClick={()=>verify(d,true)}>Verify</button><button onClick={()=>verify(d,false)}>Reject</button></>}
              <button className="dangerAction" onClick={()=>removeDonation(d)}>Delete</button>
            </div></td>
          </tr>)}</tbody>
        </table></div>
      </div>}

      {tab==="communityJoins"&&<div className="adminPanel communityJoinAdmin">
        <h2>Community joining requests ({joinRequests.length})</h2>
        <div className="tableWrap"><table><thead><tr><th>Name / Request ID</th><th>Mobile</th><th>State</th><th>Age</th><th>Status</th><th>Action / PDF</th></tr></thead>
          <tbody>{joinRequests.map(j=><tr key={j.id}><td><b>{j.name}</b><small className="joinAdminId">{j.id}</small></td><td>{j.mobile}</td><td>{j.state}</td><td>{j.age}</td><td><span className={"status "+(j.status==="approved"?"verified":j.status==="rejected"?"rejected":"pending")}>{j.status}</span></td>
          <td><div className="actions">{j.status==="pending"&&<><button onClick={()=>reviewJoin(j,true)}>Approve</button><button onClick={()=>reviewJoin(j,false)}>Reject</button></>}{j.status==="approved"&&<button onClick={()=>{setSelectedJoin(j);setTimeout(()=>window.print(),300);}}>Joining PDF</button>}</div></td></tr>)}
          {!joinRequests.length&&<tr><td colSpan="6" className="empty">Abhi koi joining request nahi aayi.</td></tr>}</tbody></table></div>
        <p className="formFine">Approved member ka PDF print/download karne ke liye request ko select karke browser print dialog mein Save as PDF choose karein.</p>
        {selectedJoin&&<section className="joinCertificatePrint">
          <div className="certificateLogo"><span className="brandIcon"><HeartHandshake/></span> UMEED COMMUNITY</div>
          <div className="sectionLabel">OFFICIAL MEMBERSHIP CONFIRMATION</div>
          <h1>Community Joining Certificate</h1>
          <p>This is to certify that</p><h2>{selectedJoin.name}</h2>
          <p>has been approved as a member of Umeed Community.</p>
          <div className="joinCertDetails"><span>Mobile: <b>{selectedJoin.mobile}</b></span><span>State: <b>{selectedJoin.state}</b></span><span>Age: <b>{selectedJoin.age}</b></span><span>Joining ID: <b>{selectedJoin.id}</b></span></div>
          <p className="joinFine">Together, we can turn compassion into action and hope into reality. Every kind act creates a brighter tomorrow. Welcome to Umeed Community!</p>
          <div className="certificateSignature"><span>With gratitude,</span><img src="data:image/png;base64,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" alt="Umeed Community handwritten signature"/><small>Umeed Community</small></div>
        </section>}

      </div>}
      {tab==="memberPayments"&&<div className="adminPanel memberPaymentsAdmin">
        <h2>Member Payments & Earnings</h2>
        <p className="formFine">Approved member ko select karke uski har payment ki entry save karein. Har member ka record alag rahega.</p>
        <div className="memberPaymentCards">
          {joinRequests.filter(j=>j.status==="approved"||j.status==="left").map(j=><button type="button" key={j.id} className={"memberPaymentCard"+(selectedPaymentMember?.id===j.id?" selected":"")} onClick={()=>setSelectedPaymentMember(j)}>
            <b>{j.name}</b><span>{j.mobile||"—"}</span><strong>{money(memberPaymentTotal(j.id))}</strong><small>{memberPayments.filter(p=>p.memberId===j.id).length} payment entries · {j.status==="left"?"Left":"Active"}</small>
          </button>)}
          {!joinRequests.some(j=>j.status==="approved"||j.status==="left")&&<p className="empty">Abhi koi approved member nahi hai.</p>}
        </div>
        {selectedPaymentMember&&<section className="adminPanel selectedMemberPayments">
          <div className="sectionHead"><div><div className="sectionLabel">SELECTED MEMBER · {selectedPaymentMember.status==="left"?"LEFT":"ACTIVE"}</div><h2>{selectedPaymentMember.name}</h2><p>{selectedPaymentMember.email||"—"} · {selectedPaymentMember.mobile||"—"}</p></div><b className="amount">{money(memberPaymentTotal(selectedPaymentMember.id))}</b></div>
          {selectedPaymentMember.status==="approved"&&<div className="actions"><button type="button" onClick={()=>markMemberLeft(selectedPaymentMember)}>Mark member as Left</button></div>}
          {selectedPaymentMember.status==="left"&&<p className="formFine">Ye member Left mark hai. Purana record safe hai aur nayi payment entry band hai.</p>}
          <div className="memberReportControls">
            <label>PDF ke liye month select karein<input type="month" value={paymentReportMonth} onChange={e=>setPaymentReportMonth(e.target.value)}/></label>
            <div className="memberReportTotals">
              <div><span>Total amount entered for this month</span><b>{money(selectedMonthTotal)}</b></div>
              <div><span>75% Umeed Community</span><b>{money(communityShare)}</b></div>
              <div><span>25% Member share</span><b>{money(memberShare)}</b></div>
            </div>
          </div>
          {selectedPaymentMember.status==="approved"&&<form className="settingsForm" onSubmit={saveMemberPayment}>
            <h3>Add payment entry</h3>
            <label>Payment amount (₹)<input type="number" min="1" step="0.01" value={paymentForm.amount} onChange={e=>setPaymentForm(p=>({...p,amount:e.target.value}))} required placeholder="Enter amount"/></label>
            <label>Payment date & time<input type="datetime-local" value={paymentForm.paidAt} onChange={e=>setPaymentForm(p=>({...p,paidAt:e.target.value}))} required/></label>
            <label>Payment reference ID<input value={paymentForm.referenceId} onChange={e=>setPaymentForm(p=>({...p,referenceId:e.target.value}))} required placeholder="UPI / bank reference ID"/></label>
            {error&&<p className="error">{error}</p>}
            <button className="primaryBtn">Save payment entry</button>
          </form>}
          <div className="actions"><button type="button" onClick={()=>window.print()}>Download this member PDF</button></div>
          <div className="tableWrap">
            <table><thead><tr><th>Payment date & time</th><th>Amount</th><th>Reference ID</th></tr></thead>
              <tbody>{memberPayments.filter(p=>p.memberId===selectedPaymentMember.id).sort((a,b)=>String(b.paidAt||"").localeCompare(String(a.paidAt||""))).map(p=><tr key={p.id}><td>{p.paidAt?new Date(p.paidAt).toLocaleString("en-IN"):"—"}</td><td className="amount">{money(p.amount)}</td><td>{p.referenceId}</td></tr>)}
              {!memberPayments.some(p=>p.memberId===selectedPaymentMember.id)&&<tr><td colSpan="3" className="empty">Is member ki payment entry abhi nahi hai.</td></tr>}</tbody>
            </table>
          </div>
          <div className="memberPaymentPrint">
            <h1>Umeed Community – Monthly Member Earnings Statement</h1>
            <h2>{selectedPaymentMember.name}</h2>
            <p>Mobile: {selectedPaymentMember.mobile||"—"} | Email: {selectedPaymentMember.email||"—"}</p>
            <h3>Statement month: {reportMonthLabel}</h3>
            <div className="memberPdfSummary">
              <p>Total verified donations received through this member: <b>{money(selectedMonthTotal)}</b></p>
              <p>Umeed Community share (75%): <b>{money(communityShare)}</b></p>
              <p>Member share (25%): <b>{money(memberShare)}</b></p>
            </div>
            <h3>Monthly payment entries</h3>
            <table><thead><tr><th>Date & Time</th><th>Amount received through member</th><th>Payment Reference ID</th></tr></thead><tbody>
              {selectedMonthPayments.map(p=><tr key={p.id}><td>{p.paidAt?new Date(p.paidAt).toLocaleString("en-IN"):"—"}</td><td>{money(p.amount)}</td><td>{p.referenceId}</td></tr>)}
              {!selectedMonthPayments.length&&<tr><td colSpan="3">No payment entries for this month.</td></tr>}
            </tbody></table>
            <p>Generated from Umeed Community admin records.</p>
          </div>
        </section>}
      </div>}
      {tab==="helpline"&&<div className="adminPanel">
        <h2>Helpline Requests ({helpRequests.length})</h2>
        <p className="formFine">Website se submit hui sabhi help requests yahan date aur time ke saath dikhengi.</p>
        {helpRequests.length===0?<p className="empty">Abhi koi helpline request nahi aayi hai.</p>:<div className="tableWrap"><table>
          <thead><tr><th>Date & Time</th><th>Mobile</th><th>Address</th><th>Help message</th></tr></thead>
          <tbody>{helpRequests.map(r=><tr key={r.id}>
            <td>{r.createdAt?.toDate?r.createdAt.toDate().toLocaleString("en-IN"):"Submitting…"}</td>
            <td><a href={`tel:${r.mobile}`}>{r.mobile}</a></td>
            <td>{r.address}</td><td className="helplineMessage">{r.message}</td>
          </tr>)}</tbody>
        </table></div>}
      </div>}

      {tab==="settings"&&<form className="adminPanel settingsForm" onSubmit={saveSettings}>
        <h2>Website content & payment details</h2>
        <label>Website name<input value={form.siteName||""} onChange={e=>setForm(p=>({...p,siteName:e.target.value}))}/></label>
        <label>Tagline<input value={form.tagline||""} onChange={e=>setForm(p=>({...p,tagline:e.target.value}))}/></label>
        <label>About / mission<textarea rows="4" value={form.about||""} onChange={e=>setForm(p=>({...p,about:e.target.value}))}/></label>
        <label>UPI ID<input value={form.upiId||""} onChange={e=>setForm(p=>({...p,upiId:e.target.value}))} placeholder="name@bank"/></label>
        <label>Payee name<input value={form.upiName||""} onChange={e=>setForm(p=>({...p,upiName:e.target.value}))}/></label>
        <label>Mobile / UPI number<input value={form.phone||""} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}/></label>
        <label>QR code image URL<input value={form.qrUrl||""} onChange={e=>setForm(p=>({...p,qrUrl:e.target.value}))} placeholder="Upload QR to R2 and paste its public URL"/></label>
        <label>Hero image URL<input value={form.heroImage||""} onChange={e=>setForm(p=>({...p,heroImage:e.target.value}))}/></label>
        <label>Instagram profile link<input type="url" value={form.instagramUrl||""} onChange={e=>setForm(p=>({...p,instagramUrl:e.target.value}))} placeholder="https://www.instagram.com/yourpage/"/></label>
        <label>Facebook page link<input type="url" value={form.facebookUrl||""} onChange={e=>setForm(p=>({...p,facebookUrl:e.target.value}))} placeholder="https://www.facebook.com/yourpage/"/></label>
        <label>People helped count<input type="number" value={form.totalHelped||"0"} onChange={e=>setForm(p=>({...p,totalHelped:e.target.value}))}/></label>
        <button className="primaryBtn">Save website settings</button>
      </form>}

      {tab==="service"&&<form className="adminPanel settingsForm" onSubmit={saveSettings}>
        <h2>Umeed Community Service page</h2>
        <label>Page heading<input value={form.serviceTitle||"Umeed Community Service"} onChange={e=>setForm(p=>({...p,serviceTitle:e.target.value}))} placeholder="Umeed Community Service"/></label>
        <label className="serviceEditor">Community information & work details<textarea rows="14" value={form.serviceContent||""} onChange={e=>setForm(p=>({...p,serviceContent:e.target.value}))} placeholder={"Yahan Umeed Community ke baare mein likhein...\n\nHamare kaam, services, activities, goals aur contact details."}/></label>
        <button className="primaryBtn">Save community service page</button>
      </form>}

      {tab==="media"&&<div className="adminPanel">
        <h2>Upload a public story</h2>
        <form className="settingsForm" onSubmit={uploadMedia}>
          <label>Media type<select value={mediaType} onChange={e=>setMediaType(e.target.value)}>
            <option value="image">Image</option><option value="video">Video</option>
          </select></label>
          <label>Title<input value={mediaTitle} onChange={e=>setMediaTitle(e.target.value)}/></label>
          <label>Caption<input value={mediaCaption} onChange={e=>setMediaCaption(e.target.value)}/></label>
          <label>Choose file<input type="file" accept={mediaType==="video"?"video/*":"image/*"} onChange={e=>setFile(e.target.files?.[0]||null)} required/></label>
          {file&&<p>{file.name} · {(file.size/1024/1024).toFixed(1)} MB</p>}
          {error&&<p className="error">{error}</p>}
          <button className="primaryBtn" disabled={uploading||!file}><UploadCloud size={18}/>{uploading?"Uploading…":"Upload to Cloudflare R2"}</button>
        </form>
        <p className="formFine">Use optimized images and compressed videos. R2 upload endpoint uses a short-lived signed URL; configure bucket CORS for your Vercel domain.</p>
        <div className="adminMediaManager">
          <h2>Uploaded photos & videos ({mediaItems.length})</h2>
          {mediaItems.length===0?<p className="formFine">Abhi koi photo ya video upload nahi hua.</p>:<div className="adminMediaGrid">{mediaItems.map(item=><article className="adminMediaItem" key={item.id}>
            {item.type==="video"?<video src={adminMediaUrl(item.url)} onError={e=>tryMediaFallback(e,item.url)} controls preload="metadata"/>:<img src={adminMediaUrl(item.url)} onError={e=>tryMediaFallback(e,item.url)} alt={item.title||"Uploaded community media"}/>}
            <div className="adminMediaInfo"><b>{item.title||"Untitled"}</b><small>{item.type==="video"?"Video":"Photo"}</small>{item.caption&&<p>{item.caption}</p>}</div>
            {editingMedia===item.id?<div className="adminMediaEdit">
              <label>Title<input value={editTitle} onChange={e=>setEditTitle(e.target.value)}/></label>
              <label>Caption<input value={editCaption} onChange={e=>setEditCaption(e.target.value)}/></label>
              <label>Replace file (optional)<input type="file" accept={item.type==="video"?"video/*":"image/*"} onChange={e=>setReplacementFile(e.target.files?.[0]||null)}/></label>
              <div className="actions"><button disabled={mediaBusy} onClick={()=>saveMediaEdit(item)}>{mediaBusy?"Saving…":"Save changes"}</button><button onClick={()=>{setEditingMedia(null);setReplacementFile(null);}}>Cancel</button></div>
            </div>:<div className="actions">
              <button onClick={()=>{setEditingMedia(item.id);setEditTitle(item.title||"");setEditCaption(item.caption||"");setReplacementFile(null);}}>Edit / Change</button>
              <button disabled={mediaBusy} onClick={()=>removeMedia(item)}>Delete</button>
            </div>}
          </article>)}</div>}
        </div>
      </div>}
    </section>
  </main>;
}

export default function App() {
  const data=useSiteData();
  return <>
    <Header settings={data.settings}/>
    <Routes>
      <Route path="/" element={<Home data={data}/>}/>
      <Route path="/photos" element={<MediaPage media={data.media} type="image"/>}/>
      <Route path="/videos" element={<MediaPage media={data.media} type="video"/>}/>
      <Route path="/details" element={<DonationDetails settings={data.settings} donations={data.donations}/>}/>
      <Route path="/service" element={<CommunityService settings={data.settings}/>}/>
      <Route path="/join-community" element={<JoinCommunity/>}/>
      <Route path="/helpline" element={<HelpLine/>}/>
      <Route path="/donate" element={<Donate settings={data.settings}/>}/>
      <Route path="/admin" element={<Admin settings={data.settings}/>}/>
    </Routes>
  </>;
}

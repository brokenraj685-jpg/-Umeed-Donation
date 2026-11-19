
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
  query(collection(db,"donations"),where("status","==","verified"),limit(1000)),
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
    </nav>
  </header>;
}


function DonationProgress({settings,donations}) {
  const received=donations.filter(d=>!d.storyId).reduce((sum,d)=>sum+Number(d.amount||0),0);
  const targets=(Array.isArray(settings.targetAmounts)?settings.targetAmounts:[]).map(item=>{
    if(item&&typeof item==="object")return {amount:Number(item.amount)||0,reason:String(item.reason||"")};
    return {amount:Number(item)||0,reason:""};
  }).filter(item=>Number.isFinite(item.amount)&&item.amount>0);
  let remainingDonation=received, currentIndex=0;
  while(currentIndex<targets.length&&remainingDonation>=targets[currentIndex].amount){remainingDonation-=targets[currentIndex].amount;currentIndex++;}
  const currentTarget=targets[currentIndex]?.amount||0;
  const currentRaised=currentTarget?Math.min(remainingDonation,currentTarget):0;
  const targetRemaining=currentTarget?Math.max(0,currentTarget-currentRaised):0;
  const percent=currentTarget?Math.min(100,Math.round(currentRaised/currentTarget*100)):0;
  return <section className="donationProgress section">
    <div className="sectionLabel">DONATION PROGRESS</div><h2>Donation progress</h2>
    <div className="donationProgressGrid donationProgressPublicGrid">
      <article><span>Total donation received</span><b>{money(received)}</b></article>
      <article><span>Current target remaining</span><b>{currentTarget?money(targetRemaining):"Target not set"}</b></article>
    </div>
    {currentTarget>0?<div className="currentDonationTarget">
      <div className="targetTitle"><b>Current target {currentIndex+1} of {targets.length}</b><strong>{money(currentTarget)}</strong></div>
      <div className="targetMeta"><span>{money(currentRaised)} received</span><b>{percent}% complete</b></div>
      <div className="targetTrack"><span style={{width:percent+"%"}}/></div>
      {targets[currentIndex].reason&&<small className="publicTargetReason">{targets[currentIndex].reason}</small>}{currentIndex+1<targets.length&&<small>Next target: {money(targets[currentIndex+1].amount)}</small>}
    </div>:<p className="formFine">Donation target will be displayed here when Admin sets it.</p>}
  </section>;
}

function Home({data}) {
  const {settings,donations,media}=data;
  const advertisements=Array.isArray(settings.advertisements)?settings.advertisements:[];
  const [impactAmount,setImpactAmount] = useState(50);
  const [adIndex,setAdIndex] = useState(0);
  const estimatedPeople = Math.round(impactAmount / 25);
  const liveAds = advertisements.filter(ad=>ad.url);
  const advertisementUrl = (url) => {
    try {
      const parsed = new URL(url, window.location.origin);
      if (parsed.pathname.startsWith("/community/")) parsed.pathname = `/umeed${parsed.pathname}`;
      return parsed.toString();
    } catch {
      return url || "";
    }
  };
  useEffect(()=>{
    setAdIndex(0);
    if(!settings.advertisingActive || liveAds.length<2)return;
    const seconds=Math.max(3,Math.min(300,Number(settings.advertisingIntervalSeconds)||15));
    const timer=setInterval(()=>setAdIndex(index=>(index+1)%liveAds.length),seconds*1000);
    return ()=>clearInterval(timer);
  },[settings.advertisingActive,settings.advertisingIntervalSeconds,liveAds.length]);

  return <>
    {liveAds.length>0&&<section className="homeAdvertising" aria-label="Community announcements">
      <div className="advertisingViewport">
        <div className="advertisingTrack" style={{transform:`translateX(-${adIndex*100}%)`}}>
          {liveAds.map((ad,i)=><div className="advertisingSlide" key={ad.id}><img src={advertisementUrl(ad.url)} onError={e=>tryMediaFallback(e,ad.url)} alt={ad.title||`Umeed announcement ${i+1}`}/></div>)}
        </div>
      </div>
    </section>}

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

    <section className="section intro">      <div className="sectionLabel">WHY WE EXIST</div>
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
      <div className="brand"><Link to="/admin" className="brandIcon" title="Admin dashboard" aria-label="Open admin dashboard"><HeartHandshake size={20}/></Link><span>{settings.siteName || "Umeed"}</span></div>
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
function MediaPage({media,type,donations}) {
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
        {Number(m.targetAmount)>0&&(()=>{
          const raised=donations.filter(d=>d.storyId===m.id&&d.status==="verified").reduce((sum,d)=>sum+Number(d.amount||0),0);
          const target=Number(m.targetAmount), remaining=Math.max(0,target-raised), percent=Math.min(100,Math.round(raised/target*100));
          return <div className="storyDonationProgress">
            {m.targetReason&&<small>{m.targetReason}</small>}
            <div className="storyDonationNumbers"><span>Zaroorat <b>{money(target)}</b></span><span>Ab Tak Mila <b>{money(raised)}</b></span></div>
            <div className="storyDonationTrack"><span style={{width:percent+"%"}}/></div>
            <div className="storyDonationFoot"><b>{percent}% complete</b><span>{money(remaining)} baki</span></div>
            <Link className="primaryBtn storyDonateBtn" to={`/donate?story=${encodeURIComponent(m.id)}`}>Donate Now <ArrowRight size={16}/></Link>
          </div>;
        })()}
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
  const topContributors = useMemo(() => {
    const grouped = new Map();
    donations.forEach(d => {
      const name = String(d.name || "Anonymous").trim() || "Anonymous";
      const state = String(d.state || "").trim();
      const mobile = String(d.mobile || "").replace(/\\D/g,"");
      const key = mobile ? "mobile:"+mobile : "name:"+name.toLowerCase()+"|state:"+state.toLowerCase();
      const current = grouped.get(key) || {name,state,total:0,count:0};
      current.total += Number(d.amount || 0);
      current.count += 1;
      if (!current.state && state) current.state = state;
      grouped.set(key,current);
    });
    return [...grouped.values()].sort((a,b)=>b.total-a.total).slice(0,10);
  },[donations]);

  return <main className="detailsPage">
    <div className="detailsHeading">
      <div className="sectionLabel">TRANSPARENCY</div>
      <h1>Donation details</h1>
      <p>A clear record of contributions made by our community.</p>
    </div>
    <DonationProgress settings={settings} donations={donations}/>
    <section className="stats detailsStats" id="impact">
      <div><span>Total donations</span><b>{money(total)}</b></div>
      <div><span>Contributions</span><b>{donations.length}</b></div>
      <div><span>People Helped Together ❤️</span><b>{settings.totalHelped || "0"}+</b></div>
      <div><span>Our promise</span><b>Transparent giving</b></div>
    </section>
    <section className="section detailsList topContributorsSection">
      <div className="sectionHead">
        <div><div className="sectionLabel">ALL-TIME LEADERS</div><h2>Top 10 contributors</h2></div>
        <Trophy size={28}/>
      </div>
      <div className="tableWrap"><table>
        <thead><tr><th>Rank</th><th>Contributor</th><th>State</th><th>Total donated</th></tr></thead>
        <tbody>{topContributors.length ? topContributors.map((d,i)=><tr key={i}>
          <td><span className="rank">{i+1}</span></td><td>{d.name}</td><td>{d.state||"—"}</td><td className="amount">{money(d.total)}</td>
        </tr>) : <tr><td colSpan="4" className="empty">Verified contributions will appear here.</td></tr>}</tbody>
      </table></div>
    </section>
    <section className="section detailsList allContributionsSection">
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
  const [founderOpen,setFounderOpen]=useState(false);
  return <main className="servicePage">
    <div className="serviceHero">
      <div className="sectionLabel">UMEED COMMUNITY</div>
      <h1>{settings.serviceTitle || "Umeed Community Service"}</h1>
      <p>Our community, our work, and the ways we bring hope together.</p>
    </div>
    <section className="serviceContent">
      {content.trim() ? <div className="serviceText">{content}</div> : <div className="serviceEmpty">Community service information will be added soon.</div>}
    </section>
    <div className="founderMessageAction"><button type="button" onClick={()=>setFounderOpen(true)}><HeartHandshake size={21}/><span><b>A Message From The Founder</b><small>Read my story &amp; purpose</small></span><span className="founderMessageArrow">Read more →</span></button></div>
    {founderOpen&&<div className="founderMessageOverlay" role="dialog" aria-modal="true" aria-label="A Message From The Founder" onClick={()=>setFounderOpen(false)}>
      <article className="founderMessageModal" onClick={e=>e.stopPropagation()}>
        <button className="founderMessageClose" type="button" onClick={()=>setFounderOpen(false)} aria-label="Close">×</button>
        <div className="sectionLabel">UMEED COMMUNITY</div>
        <h2>A Message From The Founder</h2>
        <h3>The Story, Purpose &amp; Vision Behind Umeed Community</h3>        <p>My name is <b>Raj Babu Shaikh</b>. I am a 22-year-old young man from a middle-class family, and I completed my 12th standard education in Maharashtra.</p>
        <p>I am not a lawyer, nor do I have extensive knowledge of legal matters, rules and regulations. I am simply an ordinary person who has a strong desire to do something meaningful for society.</p>
        <p>The idea behind creating <b>Umeed Community</b> came from a simple thought: What if ordinary people like us could come together, help those who are in need, and also create small earning opportunities for young people who are unemployed and struggling to support themselves?</p>
        <p>I wanted to create a platform where people could experience the happiness of helping someone, where even a small contribution could make a positive difference in another person's life, and where deserving people could receive support when they need it most.</p>
        <p>I understand that I may not know everything. I have started this initiative with good intentions and with the knowledge and resources available to me. My purpose is not to claim that I am perfect or that every decision I make will always be right. My purpose is to learn, improve and make this initiative better with time.</p>
        <h3>An Honest Request to Everyone</h3>
        <p>Umeed Community is an initiative built with the hope of helping people. However, if any member, visitor or knowledgeable person notices a mistake, weakness, misunderstanding or possible issue in our community's rules, regulations, working process or activities, I sincerely request you to please inform us first.</p>
        <p>If you have knowledge of legal matters, social work, financial transparency or any other relevant subject, your guidance would be valuable to us.</p>
        <p>Please give us an opportunity to understand the issue, review it and make the necessary improvements. We do not want to ignore genuine concerns or knowingly continue with something that may be wrong.</p>
        <p>We believe that accepting mistakes and learning from knowledgeable people is an important part of building something responsible.</p>
        <h3>Our Vision</h3>
        <ul><li>To help people who genuinely need support.</li><li>To create small earning opportunities for unemployed young people.</li><li>To encourage kindness, cooperation and humanity.</li><li>To maintain transparency and responsibility in our work.</li><li>To keep learning, improving and making our community more useful for society.</li></ul>
        <p>I may be just a 22-year-old middle-class young man, but I believe that a good initiative does not always need to begin with a big office, a large organisation or a lot of money. Sometimes, it begins with a small idea and an honest intention.</p>
        <p><b>Umeed Community is my small effort towards that idea.</b></p>
        <p>I do not claim to be perfect. I only hope that with your support, suggestions, knowledge and cooperation, we can make this effort better and bring a little more hope into people's lives.</p>
        <p>Thank you for being a part of this journey.</p>
        <p><b>With hope and gratitude,<br/>Raj Babu Shaikh<br/>Founder – Umeed Community</b></p>
        <p className="founderMessageQuote">“A small effort from ordinary people can bring a meaningful change in someone's life.”</p>
      </article>
    </div>}
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

function printWithMode(mode) {
  document.body.classList.add(mode);
  const cleanup=()=>document.body.classList.remove(mode);
  window.addEventListener("afterprint",cleanup,{once:true});
  window.print();
}

function JoinCommunity() {
  const [form,setForm]=useState({name:"",email:"",mobile:"",state:"",age:"",gender:""});
  const [busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState(""),[joinId,setJoinId]=useState("");
  const change=e=>setForm(p=>({...p,[e.target.name]:e.target.value}));
  async function submit(e){
    e.preventDefault();setError("");
    if(!db){setError("Joining service abhi available nahi hai.");return;}
    if(form.email.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())){setError("Valid Gmail / email address enter karein, ya ise khali chhod dein.");return;}
    if(!/^[6-9][0-9]{9}$/.test(form.mobile.trim())){setError("Valid 10-digit mobile number enter karein.");return;}
    if(Number(form.age)<18||Number(form.age)>100){setError("Joining ke liye age 18 se 100 ke beech honi chahiye.");return;}
    setBusy(true);
    try{
      const requestRef=doc(collection(db,"communityJoins"));
      await setDoc(requestRef,{
        name:form.name.trim(),email:form.email.trim().toLowerCase(),mobile:form.mobile.trim(),state:form.state,age:Number(form.age),gender:form.gender,
        status:"pending",createdAt:serverTimestamp(),termsAccepted:true
      });
      setJoinId(requestRef.id);setDone(true);
    }catch(err){setError(err.message||"Request submit nahi hui. Dobara try karein.");}
    finally{setBusy(false);}
  }
  return <main className="joinPage">
    <section className="joinHero"><span className="sectionLabel">BE A PART OF THE CHANGE</span><h1>Join Umeed Community</h1><p>Apni skills aur mehnat se kamayein, aur community ke zariye zarooratmand logon ki madad ka hissa banein.</p></section>
    {done?<section className="joinSuccess"><div className="joinSuccessIcon">✓</div><h2>Thank you for joining Umeed Community!</h2><p>Aapki joining request successfully submit ho gayi hai. Admin aapki details check karke joining approve karega.</p><small>Joining Request ID: {joinId}</small><div className="joinPendingStamp">PENDING ADMIN APPROVAL</div><button className="primaryBtn" onClick={()=>printWithMode("print-join-receipt")}>Download joining receipt / PDF</button><section className="joinReceiptPrint"><div className="receiptBrand">UMEED COMMUNITY</div><h1>Community Joining Receipt</h1><p className="receiptThanks">Thank you for becoming a part of Umeed Community.</p><div className="receiptStatus">PENDING ADMIN APPROVAL</div><dl><dt>Member Name</dt><dd>{form.name}</dd><dt>Mobile Number</dt><dd>{form.mobile}</dd><dt>Email</dt><dd>{form.email||"Not provided"}</dd><dt>State</dt><dd>{form.state}</dd><dt>Age</dt><dd>{form.age} Years</dd><dt>Gender</dt><dd>{form.gender}</dd><dt>Joining Request ID</dt><dd>{joinId}</dd></dl><p className="receiptFooter">Together, we can turn compassion into action and hope into reality.</p></section></section>:<>
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
        </ul><div className="joinShare"><b>85% Community</b><span>15% Member & Service Charges</span></div><p className="formFine">85% donation amount community help and service work ke liye use hoga. 15% member support/incentives aur service charges ke liye use hoga.</p></article>
      </section>
      <section className="joinFormCard"><h2>Join Community Form</h2><p>Form submit karne ke baad admin approval ka wait karein.</p>
        <form onSubmit={submit}>
          <label>Full name<input name="name" value={form.name} onChange={change} maxLength="80" required placeholder="Apna poora naam"/></label>
          <label>Gmail / Email address (optional)<input name="email" type="email" autoComplete="email" value={form.email} onChange={change} placeholder="example@gmail.com (optional)"/></label>
          <label>Mobile number<input name="mobile" type="tel" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength="10" value={form.mobile} onChange={e=>setForm(p=>({...p,mobile:e.target.value.replace(/[^0-9]/g,"").slice(0,10)}))} required placeholder="10-digit mobile number"/></label>
          <label>State<select name="state" value={form.state} onChange={change} required><option value="">Select state</option>{states.map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Age<input name="age" type="number" min="18" max="100" value={form.age} onChange={change} required placeholder="Your age"/></label>
          <label>Gender<select name="gender" value={form.gender} onChange={change} required><option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option></select></label>
          {error&&<p className="error">{error}</p>}
          <button className="primaryBtn" disabled={busy}>{busy?"Submitting…":"Join Community"}</button>
        </form>
      </section>
    </>}
  </main>;
}

function Donate({settings}) {
  const [form,setForm]=useState({name:"",mobile:"",state:"",amount:"",transactionId:"",note:""});
  const storyId=new URLSearchParams(window.location.search).get("story")?.trim()||"";
  const [storyInfo,setStoryInfo]=useState(null);
  useEffect(()=>{let active=true;if(!db||!storyId)return;getDoc(doc(db,"media",storyId)).then(s=>{if(active&&s.exists())setStoryInfo({id:s.id,...s.data()});}).catch(()=>{});return()=>{active=false;};},[storyId]);
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
    setForm({name:"",mobile:"",state:"",amount:"",transactionId:"",note:""});
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
    if(!/^[6-9][0-9]{9}$/.test(form.mobile.trim())){setError("Valid 10-digit mobile number enter karein.");return;}
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
          name:form.name.trim(),mobile:form.mobile.trim(),state:form.state,amount:Number(form.amount),
          transactionId:form.transactionId.trim(),note:form.note.trim(),
          ...(referralCode?{referralCode}:{}),
          ...(storyId?{storyId}:{}),
          certificateCode:newCode,status:"pending",createdAt:serverTimestamp()
        });
        // This mapping is create-only in Firestore rules; existing numbers cannot be reused.
        batch.set(doc(db,"certificateCodes",newCode),{donationId:docRef.id});
        try{await batch.commit();lastError=null;break;}catch(err){lastError=err;docRef=null;}
      }
      if(!docRef)throw lastError||new Error("Unique number reserve nahi ho paya. Please dobara try karein.");
      const preview={name:form.name.trim(),mobile:form.mobile.trim(),state:form.state,amount:Number(form.amount),status:"pending",certificateCode:newCode,createdAt:new Date().toISOString()};
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
          <div className="certificateSignature"><span>{verified?"With gratitude,":"Signature after payment verification"}</span>{verified?<><img src="data:image/png;base64,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" alt="Umeed Community handwritten signature" style={{display:"block",width:"100px",maxWidth:"100%",maxHeight:"30px",height:"auto",objectFit:"contain",margin:"5px 0 2px",background:"transparent",mixBlendMode:"multiply"}}/><small>Umeed Community</small></>:<><b>Pending Verification</b><small>Official signature will appear after verification</small></>}</div>
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
      {storyId&&<div className="storyDonationNotice">{storyInfo?<><b>Story donation: {storyInfo.title||"Umeed Community Story"}</b><small>{storyInfo.targetReason||"Your donation will be counted only for this story."}</small></>:<b>Story donation selected. Please wait while its details load.</b>}</div>}
      {referralCode&&<p className="referralAttribution">You are donating through <b>{referralMemberName||"Umeed Community Member"}</b></p>}
      <h1>Your kindness<br/><em>creates hope.</em></h1>
      <p>Fill in your details, make the payment using the payment details shown below, then submit your donation details. Transaction reference dena optional hai.</p>
    </div>}
    {!done&&<form className="donateForm" onSubmit={submit}>
      <h2>Donation details</h2>
      <label>Your full name<input name="name" required maxLength="80" value={form.name} onChange={change} placeholder="Enter your name"/></label>
      <label>Mobile number<input name="mobile" type="tel" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength="10" required value={form.mobile} onChange={e=>setForm(p=>({...p,mobile:e.target.value.replace(/[^0-9]/g,"").slice(0,10)}))} placeholder="Enter 10-digit mobile number"/></label>      <label>State<select name="state" required value={form.state} onChange={change}>
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
      <p className="formFine">Donation submit karne ke baad apna certificate zaroor download karein. Certificate number sambhal kar rakhein, taaki aap baad mein bhi apna certificate download kar sakein.</p>
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
  const [expenseEntries,setExpenseEntries]=useState([]);
  const [expenseForm,setExpenseForm]=useState({amount:"",purpose:"",expenseDate:new Date().toISOString().slice(0,10)});
  const [fundReportMonth,setFundReportMonth]=useState(()=>new Date().toISOString().slice(0,7));
  const [dailyDonationDate,setDailyDonationDate]=useState(()=>{const n=new Date();return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;});
  const [newTargetAmount,setNewTargetAmount]=useState("");
  const [newTargetReason,setNewTargetReason]=useState("");
  const [joinRequests,setJoinRequests]=useState([]);
  const [helpRequests,setHelpRequests]=useState([]);
  const [selectedJoin,setSelectedJoin]=useState(null);
  const [selectedIdCard,setSelectedIdCard]=useState(null);
  const [memberPayments,setMemberPayments]=useState([]);
  const [selectedPaymentMember,setSelectedPaymentMember]=useState(null);
  const [paymentForm,setPaymentForm]=useState({amount:"",paidAt:"",referenceId:""});
  const [memberPercentForm,setMemberPercentForm]=useState("15");
  const [adjustmentForm,setAdjustmentForm]=useState({amount:"",reason:"",paidAt:""});
  const [paymentReportMonth,setPaymentReportMonth]=useState(()=>new Date().toISOString().slice(0,7));
  const [memberReportMonth,setMemberReportMonth]=useState(()=>new Date().toISOString().slice(0,7));
  const [form,setForm]=useState(settings);
  const [mediaTitle,setMediaTitle]=useState("");
  const [mediaCaption,setMediaCaption]=useState("");
  const [mediaTargetAmount,setMediaTargetAmount]=useState("");
  const [mediaTargetReason,setMediaTargetReason]=useState("");
  const [editTargetAmount,setEditTargetAmount]=useState("");
  const [editTargetReason,setEditTargetReason]=useState("");
  const [mediaType,setMediaType]=useState("image");
  const [file,setFile]=useState(null);
  const [uploading,setUploading]=useState(false);
  const [mediaItems,setMediaItems]=useState([]);
  const [editingMedia,setEditingMedia]=useState(null);
  const [editTitle,setEditTitle]=useState("");
  const [editCaption,setEditCaption]=useState("");
  const [replacementFile,setReplacementFile]=useState(null);
  const [mediaBusy,setMediaBusy]=useState(false);
  const advertisementItems=Array.isArray(settings.advertisements)?settings.advertisements:[];
  const [advertisementFiles,setAdvertisementFiles]=useState([]);
  const [advertisementBusy,setAdvertisementBusy]=useState(false);
  const [advertisementInterval,setAdvertisementInterval]=useState(String(settings.advertisingIntervalSeconds||15));

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
  useEffect(()=>setAdvertisementInterval(String(settings.advertisingIntervalSeconds||15)),[settings.advertisingIntervalSeconds]);

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


  useEffect(()=>{
    if(!db||!user||!isAdmin)return;
    return onSnapshot(query(collection(db,"expenses"),orderBy("expenseDate","desc"),limit(1000)),
      snap=>setExpenseEntries(snap.docs.map(d=>({id:d.id,...d.data()}))),
      err=>setError("Expense records load error: "+err.message)
    );
  },[user,isAdmin]);

  async function login(e) {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmailAndPassword(auth,email,password);
    } catch(err) {
      setError("Login failed. Check your email and password.");    }
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

  async function archiveMember(member){
    if(member.archived)return;
    const ok=window.confirm(`${member.name||"Ye member"} ko archive karna hai? Member ka profile, referral code, donation se connection aur saari payment history safe rahegi. Member active list se hat jayega aur Archive & Reports mein dikhega.`);
    if(!ok)return;
    setError("");
    try{
      const update={
        archived:true,
        archivedAt:serverTimestamp(),
        archivedBy:user.email,
        status:"left",
        leftAt:member.leftAt||serverTimestamp(),
        leftMarkedBy:member.leftMarkedBy||user.email
      };
      await updateDoc(doc(db,"communityJoins",member.id),update);
      setSelectedPaymentMember(current=>current?.id===member.id?{...current,...update}:current);
      alert("Member archive ho gaya. Uska poora record aur payment history safe hai.");
    }catch(err){setError(err.message||"Member archive nahi ho paya.");}
  }

  function memberPaymentTotal(memberId){
    return memberPayments.filter(p=>p.memberId===memberId&&p.entryType!=="adjustment").reduce((sum,p)=>sum+Number(p.amount||0),0);
  }

  async function saveMemberPercent(e){
    e.preventDefault();setError("");
    const percent=Number(memberPercentForm);
    if(!selectedPaymentMember||!Number.isFinite(percent)||percent<0||percent>100){setError("Percentage 0 se 100 ke beech enter karein.");return;}
    try{await updateDoc(doc(db,"communityJoins",selectedPaymentMember.id),{memberPercent:percent,percentUpdatedAt:serverTimestamp(),percentUpdatedBy:user.email});setSelectedPaymentMember(p=>({...p,memberPercent:percent}));alert("Member percentage save ho gaya.");}
    catch(err){setError(err.message||"Percentage save nahi hua.");}
  }

  async function saveMemberAdjustment(e){
    e.preventDefault();setError("");
    const amount=Number(adjustmentForm.amount);
    if(!selectedPaymentMember||!Number.isFinite(amount)||amount===0){setError("Adjustment amount zero nahi ho sakta. Plus ya minus amount enter karein.");return;}
    if(!adjustmentForm.paidAt||!adjustmentForm.reason.trim()){setError("Date aur adjustment ka reason zaroori hai.");return;}
    try{await addDoc(collection(db,"memberPayments"),{memberId:selectedPaymentMember.id,memberName:selectedPaymentMember.name||"",entryType:"adjustment",amount,paidAt:adjustmentForm.paidAt,referenceId:adjustmentForm.reason.trim(),createdAt:serverTimestamp(),enteredBy:user.email});setAdjustmentForm({amount:"",reason:"",paidAt:""});alert("Amount adjustment save ho gaya.");}
    catch(err){setError(err.message||"Adjustment save nahi hua.");}
  }


  async function saveExpense(e){
    e.preventDefault();setError("");
    const amount=Number(expenseForm.amount);
    if(!Number.isFinite(amount)||amount<=0||!expenseForm.purpose.trim()||!expenseForm.expenseDate){setError("Expense amount, purpose aur date sahi bharein.");return;}
    try{
      await addDoc(collection(db,"expenses"),{amount,purpose:expenseForm.purpose.trim(),expenseDate:expenseForm.expenseDate,createdAt:serverTimestamp(),enteredBy:user.email});
      setExpenseForm({amount:"",purpose:"",expenseDate:new Date().toISOString().slice(0,10)});
      alert("Expense entry save ho gayi.");
    }catch(err){setError(err.message||"Expense save nahi hua.");}
  }

  async function editExpense(item){
    const amountInput=window.prompt("Expense amount (₹):",String(item.amount||""));
    if(amountInput===null)return;
    const purposeInput=window.prompt("Expense purpose:",item.purpose||"");
    if(purposeInput===null)return;
    const dateInput=window.prompt("Expense date (YYYY-MM-DD):",item.expenseDate||"");
    if(dateInput===null)return;
    const amount=Number(amountInput);
    if(!Number.isFinite(amount)||amount<=0||!purposeInput.trim()||!/^\\d{4}-\\d{2}-\\d{2}$/.test(dateInput)){setError("Expense amount, purpose ya date sahi nahi hai.");return;}
    try{await updateDoc(doc(db,"expenses",item.id),{amount,purpose:purposeInput.trim(),expenseDate:dateInput,updatedAt:serverTimestamp(),updatedBy:user.email});alert("Expense entry update ho gayi.");}
    catch(err){setError(err.message||"Expense update nahi hua.");}
  }

  async function deleteExpense(item){
    if(!window.confirm("Is expense entry ko permanently delete karna hai?"))return;
    try{await deleteDoc(doc(db,"expenses",item.id));alert("Expense entry delete ho gayi.");}
    catch(err){setError(err.message||"Expense delete nahi hua.");}
  }

  async function solveHelpRequest(item){
    if(item.status==="solved")return;
    try{
      await updateDoc(doc(db,"helpRequests",item.id),{
        status:"solved",
        solvedAt:serverTimestamp(),
        solvedBy:user.email
      });
    }catch(err){setError(err.message||"Request solve mark nahi hui.");}
  }

  async function deleteHelpRequest(item){
    if(!window.confirm("Is helpline request ko permanently delete karna hai?"))return;
    try{
      await deleteDoc(doc(db,"helpRequests",item.id));
    }catch(err){setError(err.message||"Helpline request delete nahi hui.");}
  }
  async function saveTargetPlan(e){
    e.preventDefault();setError("");
    const targets=(Array.isArray(form.targetAmounts)?form.targetAmounts:[]).map(item=>{
      if(item&&typeof item==="object")return {amount:Number(item.amount),reason:String(item.reason||"").trim()};
      return {amount:Number(item),reason:""};
    });
    if(!targets.length||targets.some(item=>!Number.isFinite(item.amount)||item.amount<=0)){setError("Kam se kam ek valid target amount add karein.");return;}
    try{
      await setDoc(doc(db,"site","settings"),{targetAmounts:targets,updatedAt:serverTimestamp()},{merge:true});
      setForm(p=>({...p,targetAmounts:targets}));
      alert("Donation target plan save ho gaya.");
    }catch(err){setError(err.message||"Target plan save nahi hua.");}
  }

  function donationMonthKey(d){
    const date=d.createdAt?.toDate?d.createdAt.toDate():d.createdAt?.seconds?new Date(d.createdAt.seconds*1000):new Date(d.createdAt||0);
    return Number.isNaN(date.getTime())?"":date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0");
  }

  const selectedMonthPayments=selectedPaymentMember
    ?memberPayments.filter(p=>p.memberId===selectedPaymentMember.id&&p.entryType!=="adjustment"&&String(p.paidAt||"").slice(0,7)===paymentReportMonth)
      .sort((a,b)=>String(a.paidAt||"").localeCompare(String(b.paidAt||"")))
    :[];
  const selectedMonthAdjustments=selectedPaymentMember?memberPayments.filter(p=>p.memberId===selectedPaymentMember.id&&p.entryType==="adjustment"&&String(p.paidAt||"").slice(0,7)===paymentReportMonth):[];
  const selectedMonthTotal=selectedMonthPayments.reduce((sum,p)=>sum+Number(p.amount||0),0);
  const selectedMemberPercent=Number(selectedPaymentMember?.memberPercent??15);
  const baseMemberShare=Math.round(selectedMonthTotal*selectedMemberPercent)/100;
  const adjustmentTotal=selectedMonthAdjustments.reduce((sum,p)=>sum+Number(p.amount||0),0);
  const communityShare=Math.round((selectedMonthTotal-baseMemberShare)*100)/100;
  const memberShare=Math.round((baseMemberShare+adjustmentTotal)*100)/100;
  const reportMonthLabel=new Date(paymentReportMonth+"-01T00:00:00").toLocaleDateString("en-IN",{month:"long",year:"numeric"});
  const memberReportLabel=new Date(memberReportMonth+"-01T00:00:00").toLocaleDateString("en-IN",{month:"long",year:"numeric"});
  const memberJoinMonthKey=j=>{
    const d=j.createdAt?.toDate?j.createdAt.toDate():j.createdAt?.seconds?new Date(j.createdAt.seconds*1000):new Date(j.createdAt||0);
    return Number.isNaN(d.getTime())?"":d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
  };
  const memberLeftMonthKey=j=>{
    const v=j.leftAt||j.archivedAt;
    const d=v?.toDate?v.toDate():v?.seconds?new Date(v.seconds*1000):v?new Date(v):null;
    return d&&!Number.isNaN(d.getTime())?d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"):"";
  };
  const memberRecords=joinRequests.filter(j=>["approved","left"].includes(j.status));
  const membersJoinedThisMonth=memberRecords.filter(j=>memberJoinMonthKey(j)===memberReportMonth);
  const membersLeftThisMonth=memberRecords.filter(j=>memberLeftMonthKey(j)===memberReportMonth);
  const memberMonthRows=memberRecords.map(j=>{
    const entries=memberPayments.filter(p=>p.memberId===j.id&&String(p.paidAt||"").slice(0,7)===memberReportMonth).sort((a,b)=>String(a.paidAt||"").localeCompare(String(b.paidAt||"")));
    const paid=entries.filter(p=>p.entryType!=="adjustment").reduce((sum,p)=>sum+Number(p.amount||0),0);
    const adjustments=entries.filter(p=>p.entryType==="adjustment").reduce((sum,p)=>sum+Number(p.amount||0),0);
    return {member:j,entries,paid,adjustments};
  }).sort((a,b)=>String(a.member.name||"").localeCompare(String(b.member.name||"")));
  const totalMemberMonthPayments=memberMonthRows.reduce((sum,r)=>sum+r.paid,0);
  const totalMemberMonthAdjustments=memberMonthRows.reduce((sum,r)=>sum+r.adjustments,0);
  const fundReportLabel=new Date(fundReportMonth+"-01T00:00:00").toLocaleDateString("en-IN",{month:"long",year:"numeric"});
  const monthlyFundDonations=pending.filter(d=>d.status==="verified"&&donationMonthKey(d)===fundReportMonth).sort((a,b)=>donationMonthKey(a).localeCompare(donationMonthKey(b)));
  const monthlyFundExpenses=expenseEntries.filter(e=>String(e.expenseDate||"").slice(0,7)===fundReportMonth).sort((a,b)=>String(a.expenseDate||"").localeCompare(String(b.expenseDate||"")));
  const monthlyDonationTotal=monthlyFundDonations.reduce((sum,d)=>sum+Number(d.amount||0),0);
  const dailyDonationRecords=pending.filter(d=>d.status==="verified"&&(()=>{const date=d.createdAt?.toDate?d.createdAt.toDate():d.createdAt?.seconds?new Date(d.createdAt.seconds*1000):new Date(d.createdAt||0);return !Number.isNaN(date.getTime())&&`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`===dailyDonationDate;})()).sort((a,b)=>{const da=a.createdAt?.toDate?a.createdAt.toDate():a.createdAt?.seconds?new Date(a.createdAt.seconds*1000):new Date(a.createdAt||0);const dbb=b.createdAt?.toDate?b.createdAt.toDate():b.createdAt?.seconds?new Date(b.createdAt.seconds*1000):new Date(b.createdAt||0);return da-dbb;});
  const dailyDonationTotal=dailyDonationRecords.reduce((sum,d)=>sum+Number(d.amount||0),0);
  const dailyDonationLabel=new Date(dailyDonationDate+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});

  const monthlyExpenseTotal=monthlyFundExpenses.reduce((sum,e)=>sum+Number(e.amount||0),0);

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

  async function uploadAdvertisementImages(e){
    e.preventDefault();
    if(!advertisementFiles.length)return;
    setAdvertisementBusy(true);setError("");
    try{
      const uploadedAds=[];
      for(const imageFile of advertisementFiles){
        if(!imageFile.type.startsWith("image/"))throw new Error("Sirf image files upload karein.");
        const token=await getIdToken(user);
        const res=await fetch("/api/r2-presign",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},body:JSON.stringify({fileName:imageFile.name,contentType:imageFile.type})});
        if(!res.ok)throw new Error("Advertising image upload URL nahi ban paya.");
        const signed=await res.json();
        const put=await fetch(signed.uploadUrl,{method:"PUT",headers:{"Content-Type":imageFile.type},body:imageFile});
        if(!put.ok)throw new Error("Advertising image upload fail hua: "+imageFile.name);
        uploadedAds.push({id:signed.key,url:signed.publicUrl,key:signed.key,title:imageFile.name});
      }
      await setDoc(doc(db,"site","settings"),{advertisements:[...advertisementItems,...uploadedAds],updatedAt:serverTimestamp()},{merge:true});
      setAdvertisementFiles([]);
      alert("Advertising images upload ho gayi.");
    }catch(err){setError(err.message||"Advertising images upload nahi hui.");}
    finally{setAdvertisementBusy(false);}
  }

  async function saveAdvertisingSettings(active){
    const seconds=Number(advertisementInterval);
    if(!Number.isInteger(seconds)||seconds<3||seconds>300){setError("Image change time 3 se 300 seconds ke beech rakhein.");return;}
    setAdvertisementBusy(true);setError("");
    try{
      await setDoc(doc(db,"site","settings"),{advertisingActive:Boolean(active),advertisingIntervalSeconds:seconds,updatedAt:serverTimestamp()},{merge:true});
      alert(active?"Advertising slideshow start ho gaya.":"Advertising slideshow stop ho gaya.");
    }catch(err){setError(err.message||"Advertising settings save nahi hui.");}
    finally{setAdvertisementBusy(false);}
  }

  async function removeAdvertisement(item){
    if(!window.confirm("Kya aap is advertising image ko permanently delete karna chahte hain?"))return;
    setAdvertisementBusy(true);setError("");
    try{
      await callMediaDelete(item.key);
      await updateDoc(doc(db,"site","settings"),{advertisements:advertisementItems.filter(ad=>ad.id!==item.id),updatedAt:serverTimestamp()});
    }catch(err){setError(err.message||"Advertising image delete nahi hui.");}
    finally{setAdvertisementBusy(false);}
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
        title:mediaTitle.trim(),caption:mediaCaption.trim(),type:mediaType,url:publicUrl,key,
        targetAmount:Number(mediaTargetAmount),targetReason:mediaTargetReason.trim(),createdAt:serverTimestamp()
      });
      setFile(null);
      setMediaTitle("");
      setMediaCaption("");
      setMediaTargetAmount("");
      setMediaTargetReason("");
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
        const put=await fetch(signed.uploadUrl,{method:"PUT",headers:{"Content-Type":replacementFile.type},body:replacementFile});        if(!put.ok)throw new Error("Nayi file upload nahi hui.");
        newUrl=signed.publicUrl;newKey=signed.key;
      }
      const targetAmount=Number(editTargetAmount);
      if(!Number.isFinite(targetAmount)||targetAmount<=0)throw new Error("Valid story target amount enter karein.");
      await updateDoc(doc(db,"media",item.id),{title:editTitle.trim(),caption:editCaption.trim(),url:newUrl,key:newKey,targetAmount,targetReason:editTargetReason.trim(),updatedAt:serverTimestamp()});
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

  const nav=[["overview","Overview"],["advertising","Advertising"],["donations","Donations"],["funds","Targets & Expenses"],["monthlyFunds","Monthly Reports"],["communityJoins","Community Join"],["memberPayments","Member Payments"],["memberArchive","Member Archive & Reports"],["helpline","Helpline"],["settings","Website settings"],["service","Community service"],["media","Photos & videos"]];

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

      {tab==="advertising"&&<div className="adminPanel advertisingAdmin">
        <h2>Home page advertising</h2>
        <p className="formFine">Yahan upload ki gayi images home page par 15:7 ratio ke animated banner mein dikhengi. Multiple images upload kar sakte hain; har image set kiye gaye time tak dikhegi.</p>
        <form className="settingsForm" onSubmit={uploadAdvertisementImages}>
          <label>Advertising images (multiple select kar sakte hain)<input type="file" accept="image/*" multiple onChange={e=>setAdvertisementFiles(Array.from(e.target.files||[]))}/></label>
          {advertisementFiles.length>0&&<p>{advertisementFiles.length} image(s) selected</p>}
          <button className="primaryBtn" disabled={advertisementBusy||advertisementFiles.length===0}><UploadCloud size={18}/>{advertisementBusy?"Uploading…":"Upload advertising images"}</button>
        </form>
        <div className="settingsForm">
          <label>Har image kitne seconds dikhe?<input type="number" min="3" max="300" step="1" value={advertisementInterval} onChange={e=>setAdvertisementInterval(e.target.value)}/></label>
          <p className="formFine">Default 15 seconds. Aap 3 se 300 seconds tak set kar sakte hain.</p>
          <div className="actions"><button type="button" disabled={advertisementBusy||advertisementItems.length===0} onClick={()=>saveAdvertisingSettings(true)}>Start advertising</button><button type="button" disabled={advertisementBusy} onClick={()=>saveAdvertisingSettings(false)}>Stop advertising</button></div>
          <p className="formFine">Status: {settings.advertisingActive?"Running":"Stopped"}</p>
        </div>
        {error&&<p className="error">{error}</p>}
        <div className="adminMediaManager">
          <h2>Advertising images ({advertisementItems.length})</h2>
          {advertisementItems.length===0?<p className="formFine">Abhi koi advertising image upload nahi hui.</p>:<div className="adminMediaGrid">{advertisementItems.map(item=><article className="adminMediaItem" key={item.id}>
            <img src={adminMediaUrl(item.url)} alt={item.title||"Advertising image"}/>
            <div className="adminMediaInfo"><b>{item.title||"Advertising image"}</b><small>Home page banner · 15:7 display</small></div>
            <div className="actions"><button type="button" disabled={advertisementBusy} onClick={()=>removeAdvertisement(item)}>Delete</button></div>
          </article>)}</div>}
        </div>
      </div>}

      {tab==="donations"&&<div className="adminPanel">
        <h2>Donation submissions</h2>
        <section className="dailyDonationPdfBox">
          <h3>Daily donation PDF report</h3>
          <p>Select date and download that day’s verified donation records. Mobile number and UPI transaction ID will not appear in the PDF.</p>
          <div className="dailyDonationPdfControls">
            <label>Donation date<input type="date" value={dailyDonationDate} onChange={e=>setDailyDonationDate(e.target.value)}/></label>
            <div className="dailyDonationPdfStats"><span>{dailyDonationRecords.length} donations</span><b>{money(dailyDonationTotal)}</b></div>
            <button type="button" className="primaryBtn" onClick={()=>printWithMode("print-daily-donation-report")} disabled={!dailyDonationRecords.length}>Download daily PDF</button>
          </div>
        </section>
        <div className="dailyDonationReportPrint">
          <h1>Umeed Community</h1><h2>Daily Donation Report</h2><p className="dailyDonationPrintDate">{dailyDonationLabel}</p>
          <div className="dailyDonationPrintSummary"><p>Total verified donations: <b>{dailyDonationRecords.length}</b></p><p>Total amount: <b>{money(dailyDonationTotal)}</b></p></div>
          <table><thead><tr><th>Donor Name</th><th>State</th><th>Amount</th><th>Date</th></tr></thead><tbody>
            {dailyDonationRecords.map(d=><tr key={d.id}><td>{d.name||"—"}</td><td>{d.state||"—"}</td><td>{money(d.amount)}</td><td>{d.createdAt?.toDate?.().toLocaleDateString("en-IN")||"—"}</td></tr>)}
          </tbody></table><p className="dailyDonationPrintFooter">Generated for Umeed Community records.</p>
        </div>
        <div className="tableWrap"><table>
          <thead><tr><th>Donor</th><th>Mobile Number</th><th>State</th><th>Amount</th><th>Transaction ID</th><th>Unique Number</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>{pending.map(d=><tr key={d.id}>
            <td>{d.name}</td><td>{d.mobile||"—"}</td><td>{d.state}</td><td>{money(d.amount)}</td><td>{d.transactionId}</td><td><b>{d.certificateCode||"—"}</b></td>
            <td><span className={"status "+d.status}>{d.status}</span></td>
            <td><div className="actions">
              {d.status==="pending"&&<><button onClick={()=>verify(d,true)}>Verify</button><button onClick={()=>verify(d,false)}>Reject</button></>}
              <button className="dangerAction" onClick={()=>removeDonation(d)}>Delete</button>
            </div></td>
          </tr>)}</tbody>
        </table></div>
      </div>}


      {tab==="funds"&&<div className="adminPanel fundsAdmin">
        <h2>Donation targets</h2>
        <p className="formFine">Targets ko order mein add karein. Ek target poora hone ke baad extra donation agle target mein automatically count hoga.</p>
        <form className="targetAddForm" onSubmit={e=>{e.preventDefault();const n=Number(newTargetAmount);if(!Number.isFinite(n)||n<=0||!newTargetReason.trim())return;setForm(p=>({...p,targetAmounts:[...(Array.isArray(p.targetAmounts)?p.targetAmounts:[]),{amount:n,reason:newTargetReason.trim()}]}));setNewTargetAmount("");setNewTargetReason("");}}>
          <label>New target amount (₹)<input type="number" min="1" value={newTargetAmount} onChange={e=>setNewTargetAmount(e.target.value)} placeholder="Example: 25000" required/></label>
          <label>Target kis kaam ke liye hai?<input value={newTargetReason} onChange={e=>setNewTargetReason(e.target.value)} maxLength="160" placeholder="Example: Zarooratmand parivaron ke liye ration" required/></label>
          <button className="primaryBtn">Add target</button>
        </form>
        <ol className="targetAdminList">{(Array.isArray(form.targetAmounts)?form.targetAmounts:[]).map((item,index)=>{const amount=item&&typeof item==="object"?Number(item.amount):Number(item);const reason=item&&typeof item==="object"?item.reason||"":"";return <li key={index}><span>Target {index+1}<small className="targetAdminReason">{reason||"Purpose not added"}</small></span><b>{money(amount)}</b><button type="button" className="dangerAction" onClick={()=>setForm(p=>({...p,targetAmounts:p.targetAmounts.filter((_,i)=>i!==index)}))}>Remove</button></li>;})}</ol>
        <button className="primaryBtn" onClick={saveTargetPlan}>Save target plan</button>
        <div className="fundsDivider"/>
        <h2>Expense management</h2>
        <form className="settingsForm expenseEntryForm" onSubmit={saveExpense}>
          <label>Expense amount (₹)<input type="number" min="1" value={expenseForm.amount} onChange={e=>setExpenseForm(p=>({...p,amount:e.target.value}))} required placeholder="Enter amount"/></label>
          <label>Expense purpose / details<input value={expenseForm.purpose} onChange={e=>setExpenseForm(p=>({...p,purpose:e.target.value}))} required maxLength="250" placeholder="Example: Food distribution"/></label>
          <label>Expense date<input type="date" value={expenseForm.expenseDate} onChange={e=>setExpenseForm(p=>({...p,expenseDate:e.target.value}))} required/></label>
          <button className="primaryBtn">Save expense entry</button>
        </form>
        <h3>Expense history ({expenseEntries.length})</h3>
        <div className="tableWrap"><table><thead><tr><th>Date</th><th>Purpose</th><th>Amount</th><th>Action</th></tr></thead><tbody>
          {expenseEntries.map(item=><tr key={item.id}><td>{item.expenseDate||"—"}</td><td>{item.purpose}</td><td>{money(item.amount)}</td><td><div className="actions"><button onClick={()=>editExpense(item)}>Edit</button><button className="dangerAction" onClick={()=>deleteExpense(item)}>Delete</button></div></td></tr>)}
          {!expenseEntries.length&&<tr><td colSpan="4" className="empty">Abhi koi expense entry nahi hai.</td></tr>}
        </tbody></table></div>
      </div>}

      {tab==="monthlyFunds"&&<div className="adminPanel monthlyFundsAdmin">
        <h2>Monthly donation & expense report</h2>
        <p className="formFine">Sirf admin ke liye. Selected month ke verified donations aur expenses yahan milenge. PDF ko record ke roop mein save kar sakte hain.</p>
        <div className="monthlyReportToolbar">
          <label>Report month<input type="month" value={fundReportMonth} onChange={e=>setFundReportMonth(e.target.value)}/></label>
          <button className="primaryBtn" type="button" onClick={()=>printWithMode("print-fund-report")}>Download monthly PDF</button>
        </div>
        <div className="adminCards monthlyFundSummary">
          <article><span>Total verified donations</span><b>{money(monthlyDonationTotal)}</b></article>
          <article><span>Total expenses</span><b>{money(monthlyExpenseTotal)}</b></article>
          <article><span>Balance after expenses</span><b>{money(monthlyDonationTotal-monthlyExpenseTotal)}</b></article>
          <article><span>Donation entries</span><b>{monthlyFundDonations.length}</b></article>
        </div>
        <h3>Donation details – {fundReportLabel}</h3>
        <div className="tableWrap"><table><thead><tr><th>Date</th><th>Donor</th><th>Mobile</th><th>Amount</th><th>Transaction ID</th></tr></thead><tbody>
          {monthlyFundDonations.map(d=><tr key={d.id}><td>{d.createdAt?.toDate?.().toLocaleDateString("en-IN")||"—"}</td><td>{d.name||"—"}</td><td>{d.mobile||"—"}</td><td>{money(d.amount)}</td><td>{d.transactionId||"—"}</td></tr>)}
          {!monthlyFundDonations.length&&<tr><td colSpan="5" className="empty">Is mahine koi verified donation nahi hai.</td></tr>}
        </tbody></table></div>
        <h3>Expense details – {fundReportLabel}</h3>
        <div className="tableWrap"><table><thead><tr><th>Date</th><th>Expense reason / purpose</th><th>Amount</th></tr></thead><tbody>
          {monthlyFundExpenses.map(e=><tr key={e.id}><td>{e.expenseDate||"—"}</td><td>{e.purpose||"—"}</td><td>{money(e.amount)}</td></tr>)}
          {!monthlyFundExpenses.length&&<tr><td colSpan="3" className="empty">Is mahine koi expense entry nahi hai.</td></tr>}
        </tbody></table></div>
        <div className="monthlyFundReportPrint">
          <h1>Umeed Community – Monthly Financial Report</h1>
          <h2>{fundReportLabel}</h2>          <div className="monthlyFundPrintSummary">
            <p>Total verified donations: <b>{money(monthlyDonationTotal)}</b></p>
            <p>Total expenses: <b>{money(monthlyExpenseTotal)}</b></p>
            <p>Balance after expenses: <b>{money(monthlyDonationTotal-monthlyExpenseTotal)}</b></p>
          </div>
          <h3>Donation records</h3>
          <table><thead><tr><th>Date</th><th>Donor</th><th>Mobile</th><th>Amount</th><th>Transaction ID</th></tr></thead><tbody>
            {monthlyFundDonations.map(d=><tr key={d.id}><td>{d.createdAt?.toDate?.().toLocaleDateString("en-IN")||"—"}</td><td>{d.name||"—"}</td><td>{d.mobile||"—"}</td><td>{money(d.amount)}</td><td>{d.transactionId||"—"}</td></tr>)}
            {!monthlyFundDonations.length&&<tr><td colSpan="5">No verified donations for this month.</td></tr>}
          </tbody></table>
          <h3>Expense records and reasons</h3>
          <table><thead><tr><th>Date</th><th>Reason / purpose</th><th>Amount</th></tr></thead><tbody>
            {monthlyFundExpenses.map(e=><tr key={e.id}><td>{e.expenseDate||"—"}</td><td>{e.purpose||"—"}</td><td>{money(e.amount)}</td></tr>)}
            {!monthlyFundExpenses.length&&<tr><td colSpan="3">No expense entries for this month.</td></tr>}
          </tbody></table>
          <p className="monthlyFundPrintFooter">Generated from Umeed Community admin records.</p>
        </div>
      </div>}

      {tab==="communityJoins"&&<div className="adminPanel communityJoinAdmin">
        <h2>Community joining requests ({joinRequests.length})</h2>
        <div className="tableWrap"><table><thead><tr><th>Name / Request ID</th><th>Mobile</th><th>State</th><th>Age</th><th>Gender</th><th>Status</th><th>Action / PDF</th></tr></thead>
          <tbody>{joinRequests.map(j=><tr key={j.id}><td><b>{j.name}</b><small className="joinAdminId">{j.id}</small></td><td>{j.mobile}</td><td>{j.state}</td><td>{j.age}</td><td>{j.gender||"Not specified"}</td><td><span className={"status "+(j.status==="approved"?"verified":j.status==="rejected"?"rejected":"pending")}>{j.status}</span></td>
          <td><div className="actions">{j.status==="pending"&&<><button onClick={()=>reviewJoin(j,true)}>Approve</button><button onClick={()=>reviewJoin(j,false)}>Reject</button></>}{j.status==="approved"&&<><button onClick={()=>{setSelectedJoin(j);setSelectedIdCard(null);setTimeout(()=>printWithMode("print-join-certificate"),400);}}>Joining Certificate PDF</button><button onClick={()=>{setSelectedJoin(null);setSelectedIdCard(j);setTimeout(()=>printWithMode("print-member-id"),400);}}>ID Card PDF</button></>}</div></td></tr>)}
          {!joinRequests.length&&<tr><td colSpan="7" className="empty">Abhi koi joining request nahi aayi.</td></tr>}</tbody></table></div>
        <p className="formFine">Approved member ka PDF print/download karne ke liye request ko select karke browser print dialog mein Save as PDF choose karein.</p>
        <div className="memberPrintBundle">{selectedIdCard&&<section className="memberIdCardPrint">
          <div className="memberIdCardTop"><span className="memberIdCardLogo"><HeartHandshake size={25}/></span><b>UMEED COMMUNITY</b><small>OFFICIAL MEMBER ID CARD</small></div>
          <div className="memberIdCardBody">
            <h1>{selectedIdCard.name}</h1>
            <div className="memberIdCardLine"><span>STATE</span><b>{selectedIdCard.state||"—"}</b></div>
            <div className="memberIdCardLine"><span>AGE</span><b>{selectedIdCard.age||"—"} Years</b></div>
            <div className="memberIdCardLine"><span>GENDER</span><b>{selectedIdCard.gender||"Not specified"}</b></div>
          </div>
          <div className="memberIdCardFooter"><span>UMEED COMMUNITY</span><small>Member ID: {selectedIdCard.id}</small></div>
        </section>}
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
        </div>
      </div>}
      {tab==="memberPayments"&&<div className="adminPanel memberPaymentsAdmin">
        <h2>Member Payments & Earnings</h2>
        <p className="formFine">Approved member ko select karke uski har payment ki entry save karein. Har member ka record alag rahega.</p>
        <div className="memberPaymentCards">
          {joinRequests.filter(j=>(j.status==="approved"||j.status==="left")&&!j.archived).map(j=><button type="button" key={j.id} className={"memberPaymentCard"+(selectedPaymentMember?.id===j.id?" selected":"")} onClick={()=>{setSelectedPaymentMember(j);setMemberPercentForm(String(j.memberPercent??15));}}>
            <b>{j.name}</b><span>{j.mobile||"—"}</span><strong>{money(memberPaymentTotal(j.id))}</strong><small>{memberPayments.filter(p=>p.memberId===j.id).length} payment entries · {j.status==="left"?"Left":"Active"}</small>
          </button>)}
          {!joinRequests.some(j=>(j.status==="approved"||j.status==="left")&&!j.archived)&&<p className="empty">Abhi koi active / left member list mein nahi hai. Archived members Archive & Reports mein milenge.</p>}
        </div>
        {selectedPaymentMember&&<section className="adminPanel selectedMemberPayments">
          <div className="sectionHead"><div><div className="sectionLabel">SELECTED MEMBER · {selectedPaymentMember.status==="left"?"LEFT":"ACTIVE"}</div><h2>{selectedPaymentMember.name}</h2><p>{selectedPaymentMember.email||"—"} · {selectedPaymentMember.mobile||"—"}</p></div><b className="amount">{money(memberPaymentTotal(selectedPaymentMember.id))}</b></div>
          <div className="actions">
            {selectedPaymentMember.status==="approved"&&!selectedPaymentMember.archived&&<button type="button" onClick={()=>markMemberLeft(selectedPaymentMember)}>Mark member as Left</button>}
            {!selectedPaymentMember.archived&&<button type="button" className="dangerBtn" onClick={()=>archiveMember(selectedPaymentMember)}>Archive Member</button>}
            {selectedPaymentMember.archived&&<b className="formFine">Archived — complete history preserved</b>}
          </div>
          {selectedPaymentMember.status==="approved"&&!selectedPaymentMember.archived&&<form className="settingsForm" onSubmit={saveMemberPercent}>
            <h3>Set this member's percentage</h3>
            <p className="formFine">Is member ke kaam ke hisaab se uska percentage set karein. Default 15% hai.</p>
            <label>Member percentage (%)<input type="number" min="0" max="100" step="0.01" value={memberPercentForm} onChange={e=>setMemberPercentForm(e.target.value)} required/></label>
            <button className="primaryBtn">Save member percentage</button>
          </form>}
          {selectedPaymentMember.status==="left"&&<p className="formFine">Ye member Left mark hai. Purana record safe hai aur nayi payment entry band hai.</p>}
          {selectedPaymentMember.status==="approved"&&!selectedPaymentMember.archived&&<form className="settingsForm" onSubmit={saveMemberAdjustment}>
            <h3>Increase / decrease member amount</h3>
            <p className="formFine">Plus amount se paisa badhega, minus amount se ghatega. Example: 500 ya -200.</p>
            <label>Adjustment amount (₹)<input type="number" step="0.01" value={adjustmentForm.amount} onChange={e=>setAdjustmentForm(p=>({...p,amount:e.target.value}))} required placeholder="500 ya -200"/></label>
            <label>Date & time<input type="datetime-local" value={adjustmentForm.paidAt} onChange={e=>setAdjustmentForm(p=>({...p,paidAt:e.target.value}))} required/></label>
            <label>Reason<input value={adjustmentForm.reason} onChange={e=>setAdjustmentForm(p=>({...p,reason:e.target.value}))} required placeholder="Bonus / deduction reason"/></label>
            <button className="primaryBtn">Save amount adjustment</button>
          </form>}
          <div className="memberReportControls">
            <label>PDF ke liye month select karein<input type="month" value={paymentReportMonth} onChange={e=>setPaymentReportMonth(e.target.value)}/></label>
            <div className="memberReportTotals">
              <div><span>Total amount entered for this month</span><b>{money(selectedMonthTotal)}</b></div>
              <div><span>Community balance</span><b>{money(communityShare)}</b></div>
              <div><span>Member share ({selectedMemberPercent}%) + adjustments</span><b>{money(memberShare)}</b></div>
              <div><span>Manual adjustments</span><b>{money(adjustmentTotal)}</b></div>
            </div>
          </div>
          {selectedPaymentMember.status==="approved"&&!selectedPaymentMember.archived&&<form className="settingsForm" onSubmit={saveMemberPayment}>
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
              <p>Community balance: <b>{money(communityShare)}</b></p>
              <p>Member share ({selectedMemberPercent}%): <b>{money(baseMemberShare)}</b></p>
              <p>Manual adjustments: <b>{money(adjustmentTotal)}</b></p>
              <p>Final member amount: <b>{money(memberShare)}</b></p>
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
      {tab==="memberArchive"&&<div className="adminPanel memberArchiveAdmin">
        <h2>Member Archive & Monthly Reports</h2>
        <p className="formFine">Yahan sabhi members ka permanent record rahega — active, left aur archived. Month select karke joining, leaving aur har member ki payment entries check karein.</p>
        <div className="monthlyReportToolbar">
          <label>Report month<input type="month" value={memberReportMonth} onChange={e=>setMemberReportMonth(e.target.value)}/></label>
          <button className="primaryBtn" type="button" onClick={()=>printWithMode("print-member-archive-report")}>Download monthly member PDF</button>
        </div>
        <div className="adminCards monthlyFundSummary">
          <article><span>Members joined</span><b>{membersJoinedThisMonth.length}</b></article>
          <article><span>Members left</span><b>{membersLeftThisMonth.length}</b></article>
          <article><span>Total members in records</span><b>{memberRecords.length}</b></article>
          <article><span>Monthly member payments</span><b>{money(totalMemberMonthPayments)}</b></article>
        </div>
        <h3>All members and monthly payment details — {memberReportLabel}</h3>
        <div className="tableWrap"><table><thead><tr><th>Member name</th><th>Mobile</th><th>Join date</th><th>Left date</th><th>Status</th><th>Payments in month</th><th>Adjustments</th><th>Payment entries / details</th></tr></thead><tbody>
          {memberMonthRows.map(row=><tr key={row.member.id}>
            <td><b>{row.member.name||"—"}</b></td>
            <td>{row.member.mobile||"—"}</td>
            <td>{row.member.createdAt?.toDate?.().toLocaleDateString("en-IN")||"—"}</td>
            <td>{(row.member.leftAt||row.member.archivedAt)?.toDate?.().toLocaleDateString("en-IN")||"—"}</td>
            <td>{row.member.archived?"Archived":row.member.status==="left"?"Left":row.member.status==="approved"?"Active":row.member.status}</td>
            <td>{money(row.paid)}</td>
            <td>{money(row.adjustments)}</td>
            <td>{row.entries.length?row.entries.map((p,i)=><div key={p.id}>{p.paidAt?new Date(p.paidAt).toLocaleString("en-IN"):"—"} · {money(p.amount)} · {p.entryType==="adjustment"?"Adjustment: ":""}{p.referenceId||"—"}{i<row.entries.length-1?<hr/>:null}</div>):"No entries"}</td>
          </tr>)}
          {!memberMonthRows.length&&<tr><td colSpan="8" className="empty">Abhi koi member record nahi hai.</td></tr>}        </tbody></table></div>
        <div className="memberArchivePrint">
          <h1>Umeed Community — Monthly Member Report</h1>
          <h2>{memberReportLabel}</h2>
          <div className="monthlyFundPrintSummary">
            <p>Members joined this month: <b>{membersJoinedThisMonth.length}</b></p>
            <p>Members left this month: <b>{membersLeftThisMonth.length}</b></p>
            <p>Total members in records: <b>{memberRecords.length}</b></p>
            <p>Total monthly member payments: <b>{money(totalMemberMonthPayments)}</b></p>
            <p>Total adjustments: <b>{money(totalMemberMonthAdjustments)}</b></p>
          </div>
          <table><thead><tr><th>Member</th><th>Mobile</th><th>Join date</th><th>Left date</th><th>Status</th><th>Payments</th><th>Adjustments</th><th>Payment details</th></tr></thead><tbody>
            {memberMonthRows.map(row=><tr key={row.member.id}><td>{row.member.name||"—"}</td><td>{row.member.mobile||"—"}</td><td>{row.member.createdAt?.toDate?.().toLocaleDateString("en-IN")||"—"}</td><td>{(row.member.leftAt||row.member.archivedAt)?.toDate?.().toLocaleDateString("en-IN")||"—"}</td><td>{row.member.archived?"Archived":row.member.status==="left"?"Left":row.member.status==="approved"?"Active":row.member.status}</td><td>{money(row.paid)}</td><td>{money(row.adjustments)}</td><td>{row.entries.map(p=><div>{p.paidAt?new Date(p.paidAt).toLocaleString("en-IN"):"—"} · {money(p.amount)} · {p.referenceId||"—"}</div>)}</td></tr>)}
          </tbody></table>
          <p>Generated from Umeed Community admin records.</p>
        </div>
      </div>}

      {tab==="helpline"&&<div className="adminPanel">
        <h2>Helpline Requests ({helpRequests.length})</h2>
        <p className="formFine">Website se submit hui sabhi help requests yahan date aur time ke saath dikhengi.</p>
        {helpRequests.length===0?<p className="empty">Abhi koi helpline request nahi aayi hai.</p>:<div className="tableWrap"><table>
          <thead><tr><th>Date & Time</th><th>Mobile</th><th>Address</th><th>Help message</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{helpRequests.map(r=><tr key={r.id} className={r.status==="solved"?"helplineSolvedRow":""}>
            <td>{r.createdAt?.toDate?r.createdAt.toDate().toLocaleString("en-IN"):"Submitting…"}</td>
            <td><a href={`tel:${r.mobile}`}>{r.mobile}</a></td>
            <td>{r.address}</td><td className="helplineMessage">{r.message}</td>
            <td><span className={r.status==="solved"?"helplineSolvedStatus":"helplinePendingStatus"}>{r.status==="solved"?"Solved":"Pending"}</span></td>
            <td><div className="helplineActions">
              <button type="button" className="helplineSolveBtn" disabled={r.status==="solved"} onClick={()=>solveHelpRequest(r)}>{r.status==="solved"?"Solved":"Solve"}</button>
              <button type="button" className="helplineDeleteBtn" onClick={()=>deleteHelpRequest(r)}>Delete</button>
            </div></td>
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
          <label>Donation target amount (₹)<input type="number" min="1" value={mediaTargetAmount} onChange={e=>setMediaTargetAmount(e.target.value)} required placeholder="Example: 20000"/></label>
          <label>Target kis liye hai?<input value={mediaTargetReason} onChange={e=>setMediaTargetReason(e.target.value)} maxLength="180" required placeholder="Example: Ilaaj ke liye"/></label>
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
            <div className="adminMediaInfo"><b>{item.title||"Untitled"}</b><small>{item.type==="video"?"Video":"Photo"} · Target {money(item.targetAmount||0)}</small>{item.targetReason&&<p>{item.targetReason}</p>}<p>Verified story donations: {money(pending.filter(d=>d.storyId===item.id&&d.status==="verified").reduce((sum,d)=>sum+Number(d.amount||0),0))}</p></div>
            {editingMedia===item.id?<div className="adminMediaEdit">
              <label>Title<input value={editTitle} onChange={e=>setEditTitle(e.target.value)}/></label>
              <label>Caption<input value={editCaption} onChange={e=>setEditCaption(e.target.value)}/></label>
              <label>Donation target amount (₹)<input type="number" min="1" value={editTargetAmount} onChange={e=>setEditTargetAmount(e.target.value)} required/></label>
              <label>Target purpose<input value={editTargetReason} onChange={e=>setEditTargetReason(e.target.value)} maxLength="180"/></label>
              <label>Replace file (optional)<input type="file" accept={item.type==="video"?"video/*":"image/*"} onChange={e=>setReplacementFile(e.target.files?.[0]||null)}/></label>
              <div className="actions"><button disabled={mediaBusy} onClick={()=>saveMediaEdit(item)}>{mediaBusy?"Saving…":"Save changes"}</button><button onClick={()=>{setEditingMedia(null);setReplacementFile(null);}}>Cancel</button></div>
            </div>:<div className="actions">
              <button onClick={()=>{setEditingMedia(item.id);setEditTitle(item.title||"");setEditCaption(item.caption||"");setEditTargetAmount(String(item.targetAmount||""));setEditTargetReason(item.targetReason||"");setReplacementFile(null);}}>Edit / Change</button>
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
      <Route path="/photos" element={<MediaPage media={data.media} donations={data.donations} type="image"/>}/>
      <Route path="/videos" element={<MediaPage media={data.media} donations={data.donations} type="video"/>}/>
      <Route path="/details" element={<DonationDetails settings={data.settings} donations={data.donations}/>}/>
      <Route path="/service" element={<CommunityService settings={data.settings}/>}/>
      <Route path="/join-community" element={<JoinCommunity/>}/>
      <Route path="/helpline" element={<HelpLine/>}/>
      <Route path="/donate" element={<Donate settings={data.settings}/>}/>
      <Route path="/admin" element={<Admin settings={data.settings}/>}/>
    </Routes>
  </>;
}
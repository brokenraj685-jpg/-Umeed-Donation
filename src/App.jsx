
import React, { useEffect, useMemo, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { auth, db, firebaseReady } from "./firebase";
import { signInWithEmailAndPassword, signOut, getIdToken, sendEmailVerification } from "firebase/auth";
import { signInWithEmailAndPassword, signOut, getIdToken } from "firebase/auth";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, updateDoc, doc, where, limit } from "firebase/firestore";

const ADMIN_EMAIL = "rajbabushaikh18@gmail.com";

const money = n => new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:0 }).format(Number(n||0));

const states = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu and Kashmir","Ladakh","Puducherry"];

function useSiteData() {
  const [settings,setSettings] = useState({siteName:"Umeed",tagline:"Together, we can bring hope.",about:"A community-led effort to support families and individuals facing hardship. Every verified contribution is recorded transparently.",upiId:"",upiName:"",qrUrl:"",phone:"",heroImage:"",totalHelped:"0",goal:"500000"});
  const [donations,setDonations] = useState([]);
  const [media,setMedia] = useState([]);

  useEffect(() => {
    if (!db) return;
    const stopA = onSnapshot(doc(db,"site","settings"), s => { if(s.exists()) setSettings(p=>({...p,...s.data()})); });
    const stopB = onSnapshot(query(collection(db,"donations"),where("status","==","verified"),orderBy("createdAt","desc"),limit(100)), s => setDonations(s.docs.map(d=>({id:d.id,...d.data()}))));
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
      <Link to="/details" onClick={()=>setOpen(false)}>Donation details</Link>
      <a href="/#leaderboard" onClick={()=>setOpen(false)}>Leaderboard</a>
      <a href="/#gallery" onClick={()=>setOpen(false)}>Stories</a>
      <Link className="navDonate" to="/donate" onClick={()=>setOpen(false)}>Donate now <ArrowRight size={16}/></Link>
      <Link to="/admin" className="adminLink" onClick={()=>setOpen(false)}>Admin</Link>
    </nav>
  </header>;
}

function Home({data}) {
  const {settings,donations,media}=data;
  const top = useMemo(()=>[...donations].sort((a,b)=>Number(b.amount)-Number(a.amount)).slice(0,10),[donations]);

  return <>
    <section className="section leaderboard compactLeaderboard" id="leaderboard">
      <div className="sectionHead">
        <div><div className="sectionLabel">COMMUNITY OF GIVERS</div><h2>Daily kindness leaders</h2><p>Top verified donations from our community.</p></div>
        <Trophy size={34}/>
      </div>
      <div className="tableWrap"><table>
        <thead><tr><th>Rank</th><th>Donor</th><th>State</th><th>Amount</th><th>Date</th></tr></thead>
        <tbody>{top.length?top.map((d,i)=><tr key={d.id}>
          <td><span className="rank">{i+1}</span></td><td>{d.name}</td><td>{d.state}</td><td className="amount">{money(d.amount)}</td>
          <td>{d.createdAt?.toDate?.().toLocaleDateString("en-IN") || "Recently"}</td>
        </tr>):<tr><td colSpan="5" className="empty">Verified donations will appear here.</td></tr>}</tbody>
      </table></div>
      <p className="privacyNote">Donor names, states and amounts are displayed publicly after verification.</p>
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
        <div className="trust"><ShieldCheck size={17}/> Donations are published after admin verification</div>
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
        <div><div className="sectionLabel">REAL STORIES</div><h2>Moments of hope</h2><p>Photos and videos shared by the admin.</p></div>
        <Camera size={32}/>
      </div>
      <div className="mediaGrid">{media.length?media.map(m=><article className="mediaCard" key={m.id}>
        {m.type==="video"?<video src={m.url} controls/>:<img src={m.url} alt={m.title||"Community story"}/>}
        <div><b>{m.title}</b><p>{m.caption}</p></div>
      </article>):<div className="emptyGallery"><Camera size={30}/><span>Stories and updates will be shared here.</span></div>}</div>
    </section>

    <section className="closing">
      <div><div className="sectionLabel">YOUR HELP MATTERS</div><h2>One act of giving<br/>can start a chain of hope.</h2></div>
      <Link to="/donate" className="primaryBtn">Donate today <ArrowRight size={18}/></Link>
    </section>

    <footer>
      <Link to="/" className="brand"><span className="brandIcon"><HeartHandshake size={20}/></span>{settings.siteName || "Umeed"}</Link>
      <span>Built on kindness. Powered by community.</span>
      <Link to="/admin">Admin access</Link>
    </footer>
  </>;
}

function DonationDetails({settings,donations}) {
  const total = donations.reduce((sum,d)=>sum+Number(d.amount||0),0);

  return <main className="detailsPage">
    <div className="detailsHeading">
      <div className="sectionLabel">TRANSPARENCY</div>
      <h1>Donation details</h1>
      <p>All figures below are based on verified contributions.</p>
    </div>
    <section className="stats detailsStats" id="impact">
      <div><span>Total verified donations</span><b>{money(total)}</b></div>
      <div><span>Verified contributions</span><b>{donations.length}</b></div>
      <div><span>People helped</span><b>{settings.totalHelped || "0"}+</b></div>
      <div><span>Our promise</span><b>Transparent giving</b></div>
    </section>
    <section className="section detailsList">
      <div className="sectionHead">
        <div><div className="sectionLabel">VERIFIED RECORD</div><h2>All verified contributions</h2></div>
        <ShieldCheck size={28}/>
      </div>
      <div className="tableWrap"><table>
        <thead><tr><th>Donor</th><th>State</th><th>Amount</th><th>Date</th></tr></thead>
        <tbody>{donations.length ? donations.map(d=><tr key={d.id}>
          <td>{d.name}</td><td>{d.state}</td><td className="amount">{money(d.amount)}</td>
          <td>{d.createdAt?.toDate?.().toLocaleDateString("en-IN") || "Recently"}</td>
        </tr>) : <tr><td colSpan="4" className="empty">Verified donations will appear here.</td></tr>}</tbody>
      </table></div>
      <p className="privacyNote">Only admin-verified donations are displayed.</p>
    </section>
  </main>;
}

function Donate({settings}) {
  const [form,setForm]=useState({name:"",state:"",amount:"",transactionId:"",note:""});
  const [busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState("");
  const change=e=>setForm(p=>({...p,[e.target.name]:e.target.value}));

  async function submit(e) {
    e.preventDefault();
    setError("");
    if(!db){setError("Firebase is not configured yet. Please try again after setup.");return;}
    if(Number(form.amount)<1){setError("Please enter a valid donation amount.");return;}
    setBusy(true);
    try {
      await addDoc(collection(db,"donations"),{
        name:form.name.trim(),state:form.state,amount:Number(form.amount),
        transactionId:form.transactionId.trim(),note:form.note.trim(),
        status:"pending",createdAt:serverTimestamp()
      });
      setDone(true);
    } catch(err) {
      setError(err.message||"Could not submit donation.");
    } finally {
      setBusy(false);
    }
  }

  if(done)return <main className="formPage"><div className="successCard">
    <CheckCircle2 size={48}/><h1>Thank you for your kindness.</h1>
    <p>Your donation details have been submitted for verification. It will appear on the public leaderboard after admin approval.</p>
    <Link to="/" className="primaryBtn">Back to home</Link>
  </div></main>;

  return <main className="formPage">
    <div className="formIntro">
      <div className="sectionLabel">GIVE WITH PURPOSE</div>
      <h1>Your kindness<br/><em>creates hope.</em></h1>
      <p>Fill in your details, make the payment using the admin's QR/UPI details, then submit your transaction reference.</p>
    </div>
    <form className="donateForm" onSubmit={submit}>
      <h2>Donation details</h2>
      <label>Your full name<input name="name" required maxLength="80" value={form.name} onChange={change} placeholder="Enter your name"/></label>
      <label>State<select name="state" required value={form.state} onChange={change}>
        <option value="">Select your state</option>{states.map(s=><option key={s}>{s}</option>)}
      </select></label>
      <label>Donation amount (₹)<input name="amount" required type="number" min="1" max="10000000" value={form.amount} onChange={change} placeholder="e.g. 500"/></label>
      <div className="paymentBox">
        <b>Make your payment</b>
        {settings.qrUrl?<img className="qr" src={settings.qrUrl} alt="Donation payment QR code"/>:<div className="qrMissing">Admin has not added a QR code yet.</div>}
        {settings.upiId&&<p>UPI ID: <b>{settings.upiId}</b></p>}
        {settings.upiName&&<p>Payee: {settings.upiName}</p>}
        {settings.phone&&<p>UPI / Mobile: {settings.phone}</p>}
        <small>Pay only to the details shown here. Keep your transaction reference.</small>
      </div>
      <label>UPI transaction ID / reference<input name="transactionId" required value={form.transactionId} onChange={change} placeholder="Enter payment reference"/></label>
      <label>Message (optional)<textarea name="note" rows="3" maxLength="300" value={form.note} onChange={change} placeholder="A short message"/></label>
      {error&&<p className="error">{error}</p>}
      <button className="primaryBtn full" disabled={busy}>{busy?"Submitting…":"Submit donation for verification"}</button>
      <p className="formFine">Your donation is marked pending until an admin verifies the payment. Do not submit someone else's transaction details.</p>
    </form>
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
  const [form,setForm]=useState(settings);
  const [mediaTitle,setMediaTitle]=useState("");
  const [mediaCaption,setMediaCaption]=useState("");
  const [mediaType,setMediaType]=useState("image");
  const [file,setFile]=useState(null);
  const [uploading,setUploading]=useState(false);

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
      query(collection(db,"donations"),orderBy("createdAt","desc"),limit(250)),
      s=>setPending(s.docs.map(d=>({id:d.id,...d.data()}))),
      err=>setError(err.message)
    );
  },[user,isAdmin]);

  useEffect(()=>setForm(settings),[settings]);

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

  async function verify(d,approved) {
    await updateDoc(doc(db,"donations",d.id),{
      status:approved?"verified":"rejected",
      reviewedAt:serverTimestamp(),
      reviewedBy:user.email
    });
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
      const {uploadUrl,publicUrl}=await res.json();
      const put=await fetch(uploadUrl,{method:"PUT",headers:{"Content-Type":file.type},body:file});
      if(!put.ok)throw new Error("Upload failed.");
      await addDoc(collection(db,"media"),{
        title:mediaTitle,caption:mediaCaption,type:mediaType,url:publicUrl,createdAt:serverTimestamp()
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

  const nav=[["overview","Overview"],["donations","Donations"],["settings","Website settings"],["media","Photos & videos"]];

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
          <thead><tr><th>Donor</th><th>State</th><th>Amount</th><th>Transaction ID</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>{pending.map(d=><tr key={d.id}>
            <td>{d.name}</td><td>{d.state}</td><td>{money(d.amount)}</td><td>{d.transactionId}</td>
            <td><span className={"status "+d.status}>{d.status}</span></td>
            <td>{d.status==="pending"?<div className="actions">
              <button onClick={()=>verify(d,true)}>Verify</button><button onClick={()=>verify(d,false)}>Reject</button>
            </div>:"—"}</td>
          </tr>)}</tbody>
        </table></div>
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
        <label>People helped count<input type="number" value={form.totalHelped||"0"} onChange={e=>setForm(p=>({...p,totalHelped:e.target.value}))}/></label>
        <button className="primaryBtn">Save website settings</button>
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
      <Route path="/details" element={<DonationDetails settings={data.settings} donations={data.donations}/>}/>
      <Route path="/donate" element={<Donate settings={data.settings}/>}/>
      <Route path="/admin" element={<Admin settings={data.settings}/>}/>
    </Routes>
  </>;
}


function Home({data}) {
  const {settings,donations,media}=data;
  const [now,setNow]=useState(Date.now());

  useEffect(()=>{
    const timer=setInterval(()=>setNow(Date.now()),60*1000);
    return ()=>clearInterval(timer);
  },[]);

  const top=useMemo(()=>[...donations]
    .filter(d=>{
      const created=d.createdAt?.toMillis?.()||0;
      return created>0 && now>=created && now-created<12*60*60*1000;
    })
    .sort((a,b)=>Number(b.amount)-Number(a.amount))
    .slice(0,5),[donations,now]);

  return <>
    <section className="section leaderboard compactLeaderboard" id="leaderboard">
      <div className="sectionHead">
        <div>
          <div className="sectionLabel">COMMUNITY OF GIVERS</div>
          <h2>Top 5 kindness leaders</h2>
          <p>Verified donations from the last 12 hours.</p>
        </div>
        <Trophy size={34}/>
      </div>
      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Donor</th>
              <th>State</th>
              <th>Amount</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {top.length?top.map((d,i)=><tr key={d.id}>
              <td><span className="rank">{i+1}</span></td>
              <td>{d.name}</td>
              <td>{d.state}</td>
              <td className="amount">{money(d.amount)}</td>
              <td>{d.createdAt?.toDate?.().toLocaleDateString("en-IN")||"Recently"}</td>
            </tr>):<tr>
              <td colSpan="5" className="empty">No verified donations in the last 12 hours.</td>
            </tr>}
          </tbody>
        </table>
      </div>
      <p className="privacyNote">Donor names, states and amounts are displayed publicly after verification. Each donation stays on the leaderboard for 12 hours.</p>
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
        <div>
          <div className="sectionLabel">REAL STORIES</div>
          <h2>Moments of hope</h2>
          <p>Photos and videos shared by the admin.</p>
        </div>
        <Camera size={32}/>
      </div>
      <div className="mediaGrid">
        {media.length?media.map(m=><article className="mediaCard" key={m.id}>
          {m.type==="video"?<video src={m.url} controls/>:<img src={m.url} alt={m.title||"Community story"}/>}
          <div><b>{m.title}</b><p>{m.caption}</p></div>
        </article>):<div className="emptyGallery"><Camera size={30}/><span>Stories and updates will be shared here.</span></div>}
      </div>
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

'use strict';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const e = escapeHTML;
const safeURL = value => { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
const bookmarkIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12v17l-6-4-6 4Z"/></svg>';
const checkIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
const sourceIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H5v18h14V8Zm0 0v5h5M8 12h8M8 16h6"/></svg>';
let data = {firms:[]}, people = [], firms = [], currentItems = [], toastTimer;
const state = {view:'people', query:'', firm:'', sectors:new Set(), email:true, sort:'firm-aum'};
let saved = new Set();
try { const s = JSON.parse(localStorage.getItem('gsb-atlas-shortlist') || '[]'); if (Array.isArray(s)) saved = new Set(s.filter(x => typeof x === 'string')); } catch { /* Local storage is optional. */ }

function initials(name) { return name.split(/\s+/).filter(Boolean).map(n => n[0]).slice(0,2).join(''); }
function profileSources(person) {
  const sources = [...(person.sources || [])];
  if (person.emailSource) sources.push(typeof person.emailSource === 'string' ? {title:'Public professional email',url:person.emailSource} : person.emailSource);
  if (person.photoSource) sources.push(typeof person.photoSource === 'string' ? {title:'Official portrait source',url:person.photoSource} : person.photoSource);
  return sources.filter((s,i,a) => safeURL(s.url) && a.findIndex(t => t.url === s.url) === i);
}
function sourceList(sources) { return `<ul class="source-list">${sources.filter(s=>safeURL(s.url)).map(s=>`<li><a href="${e(safeURL(s.url))}" target="_blank" rel="noopener noreferrer">${e(s.title || 'Source')} ↗</a><small>${e(new URL(s.url).hostname.replace(/^www\./,''))}</small></li>`).join('')}</ul>`; }
function photo(person, detail=false) {
  const url = person.photoUrl?.startsWith('assets/') ? person.photoUrl : safeURL(person.photoUrl);
  return url ? `<img ${detail?'class="profile-photo"':''} src="${e(url)}" alt="${e(person.name)}" loading="${detail?'eager':'lazy'}" referrerpolicy="no-referrer" data-portrait="${e(person.id)}">` : `<div class="portrait-placeholder" role="img" aria-label="No verified portrait available for ${e(person.name)}"><span>${e(initials(person.name))}</span><small>Portrait unavailable</small></div>`;
}
function tags(sectors, limit=99) { if(!sectors?.length)return '<span class="sector-tag">Focus not stated</span>';return (sectors || []).slice(0,limit).map(s=>`<span class="sector-tag">${e(s)}</span>`).join(''); }
function personCard(p) {
  const isSaved = saved.has(p.id), sourceCount = profileSources(p).length;
  return `<article class="person-card glass" data-person="${e(p.id)}"><div class="portrait-wrap">${photo(p)}<span class="degree-badge">${checkIcon} GSB ${e(p.degree || 'MBA')}${p.gradYear?' · '+e(p.gradYear):''}</span><button class="save-button ${isSaved?'saved':''}" data-save="${e(p.id)}" aria-pressed="${isSaved}" aria-label="${isSaved?'Remove':'Save'} ${e(p.name)}${isSaved?' from':' to'} shortlist">${bookmarkIcon}</button></div><div class="person-body"><h3><button class="name-button" data-profile="${e(p.id)}">${e(p.name)}</button></h3><p class="person-title">${e(p.title)}</p><div class="person-firm"><span class="firm-monogram" aria-hidden="true">${e(initials(p.firm.name))}</span><span>${e(p.firm.name)}</span></div><div class="sector-tags">${tags(p.sectors,2)}</div><div class="person-footer"><span class="source-count">${sourceIcon}${sourceCount} ${sourceCount===1?'source':'sources'}</span><button class="profile-link" data-profile="${e(p.id)}">View profile <span>↗</span></button></div></div></article>`;
}
function firmCard(f) {
  return `<article class="firm-card glass"><span class="firm-rank" aria-label="AUM rank ${f.rank || 'unranked'}">${f.rank?String(f.rank).padStart(2,'0'):'—'}</span><div><h3><button class="name-button" data-firm-detail="${e(f.id)}">${e(f.name)}</button></h3><p>${e(f.headquarters || 'United States')} · ${e(f.sectors.slice(0,2).join(' / '))}</p></div><div class="aum">${e(f.aumBillions===null?'N/D':f.aumDisplay)}<span class="aum-caption">${f.aumBillions===null?'AUM not disclosed':'Disclosed AUM'}</span></div><div class="firm-actions"><button data-firm-people="${e(f.id)}">${f.people.length} ${f.people.length===1?'alumnus':'alumni'} identified ↗</button><button class="text-button" data-firm-detail="${e(f.id)}">AUM & sources ↗</button></div></article>`;
}
function matches(item, isFirm) {
  const firm = isFirm ? item : item.firm;
  if (state.firm && firm.id !== state.firm) return false;
  if (state.email && !(isFirm ? firm.people.some(p=>p.email) : item.email)) return false;
  const sectors = item.sectors || [];
  if (state.sectors.size && !sectors.some(s=>state.sectors.has(s))) return false;
  const haystack = [item.name,firm.name,item.title,item.location,item.headquarters,item.background,item.description,item.education,...(item.sectorDetail || []),...(item.interests || []),...sectors].filter(Boolean).join(' ').toLowerCase();
  return state.query.trim().toLowerCase().split(/\s+/).every(word=>haystack.includes(word));
}
function render() {
  const isFirm = state.view === 'firms';
  const source = isFirm ? firms : state.view==='saved' ? people.filter(p=>saved.has(p.id)) : people;
  currentItems = source.filter(item=>matches(item,isFirm)).sort((a,b)=>state.sort==='name' ? a.name.localeCompare(b.name) : ((isFirm?b.aumBillions:b.firm.aumBillions) ?? -1)-((isFirm?a.aumBillions:a.firm.aumBillions) ?? -1) || a.name.localeCompare(b.name));
  $('#results').className = isFirm ? 'firm-grid' : 'people-grid';
  $('#results').setAttribute('aria-labelledby',`${state.view}-tab`);
  $('#results-summary').innerHTML = `<strong>${currentItems.length}</strong> ${isFirm?'firms':state.view==='saved'?'saved alumni':'alumni'}${state.firm?' at '+e(firms.find(f=>f.id===state.firm)?.name || ''):' in view'}`;
  $('#ranking-note').hidden = !isFirm;
  $('#search').placeholder=isFirm?'Search firms and investment focus…':'Search people, firms, expertise…';
  $('#results').innerHTML = currentItems.length ? currentItems.map(isFirm?firmCard:personCard).join('') : `<div class="empty-state glass"><div class="empty-icon">${state.view==='saved'?'♧':'⌕'}</div><h3>${state.view==='saved'&&!saved.size?'Your next connections, collected.':'No matches just yet.'}</h3><p>${state.view==='saved'&&!saved.size?'Tap the bookmark on any profile to build your shortlist.<br>It stays in this browser, ready when you are.':state.firm&&!people.some(p=>p.firm.id===state.firm)?'No current GSB MBA alumni were verified for this firm in this research pass.<br>This does not establish that the firm has no GSB alumni.':'Try another name, a broader focus, or clear your filters.'}</p><button class="primary-button" data-action="reset-all">Explore all alumni ↗</button></div>`;
  $$('[data-view]').forEach(btn=>{ const active=btn.dataset.view===state.view; btn.classList.toggle('active',active); if(btn.getAttribute('role')==='tab'){btn.setAttribute('aria-selected',String(active));btn.tabIndex=active?0:-1;} });
  $('#saved-count').textContent=saved.size;
  const filters=[];
  if(state.firm) filters.push({type:'firm',label:firms.find(f=>f.id===state.firm)?.name});
  for(const sector of state.sectors) filters.push({type:'sector',value:sector,label:sector});
  if(state.email) filters.push({type:'email',label:'Public email'});
  $('#active-filters').innerHTML=filters.map(f=>`<button class="filter-pill" data-remove-filter="${e(f.type)}" data-value="${e(f.value || '')}">${e(f.label)} <span aria-label="Remove filter">×</span></button>`).join('');
  $('#export-button').disabled = !currentItems.length;
}
function syncControls(){ $('#firm-filter').value=state.firm; $('#search').value=state.query; $('#email-filter').checked=state.email; $('#sort').value=state.sort; $('#mobile-sector-filter').value=[...state.sectors][0] || ''; $$('[data-sector]').forEach(x=>x.checked=state.sectors.has(x.dataset.sector)); }
function resetFilters(){ state.query='';state.firm='';state.sectors.clear();state.email=false;syncControls();render(); }
function setView(view){state.view=view;render();}
function notify(message){const toast=$('#toast');toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2600);}
function saveProfile(id){if(saved.has(id))saved.delete(id);else saved.add(id);try{localStorage.setItem('gsb-atlas-shortlist',JSON.stringify([...saved]));}catch{notify('Saved for this visit; browser storage is unavailable.');}render();$$(`[data-save="${CSS.escape(id)}"]`).forEach(b=>{b.classList.toggle('saved',saved.has(id));b.setAttribute('aria-pressed',String(saved.has(id)));if(b.classList.contains('dialog-save'))b.innerHTML=bookmarkIcon+(saved.has(id)?'Saved to shortlist':'Save to shortlist');});notify(saved.has(id)?'Added to your shortlist':'Removed from your shortlist');}
function openDialog(html){$('#dialog-content').innerHTML=`<button class="dialog-close" data-action="close-dialog" aria-label="Close dialog">×</button><div class="dialog-inner">${html}</div>`;if(!$('#detail-dialog').open)$('#detail-dialog').showModal();$('#detail-dialog').scrollTop=0;}
function emailSourceLabel(p){
  return ({company:'Company publication',filing:'Public filing', 'third-party':'Third-party listing'})[p.emailEvidenceType] || 'Public source';
}
function professionalContact(p, email){
  if(!email) return `<p class="detail-muted">No complete public work email located.</p>${p.emailResearch?`<p class="detail-muted">${e(p.emailResearch)}</p>`:''}`;
  const source=typeof p.emailSource==='string'?p.emailSource:p.emailSource?.url;
  return `<span class="email-evidence ${p.emailEvidenceType==='third-party'?'directory-evidence':''}">${e(emailSourceLabel(p))}</span><p class="email-address"><a href="mailto:${e(email)}">${e(email)}</a></p><div class="contact-actions"><button class="text-button" data-copy-email="${e(email)}">Copy email ↗</button>${safeURL(source)?`<a class="text-button" href="${e(safeURL(source))}" target="_blank" rel="noopener noreferrer">Email source ↗</a>`:''}</div><p class="detail-muted">${e(p.emailNote || 'Published in a public professional source; deliverability not independently verified.')}</p>`;
}
function profileDetail(id){
  const p=people.find(p=>p.id===id);if(!p)return;
  const sources=profileSources(p), email = p.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email) ? p.email : null;
  openDialog(`<div class="profile-header">${photo(p,true)}<div><div class="eyebrow">STANFORD GSB ${e(p.degree || 'MBA')} ${p.gradYear?'· '+e(p.gradYear):''}</div><h2 id="dialog-title">${e(p.name)}</h2><p>${e(p.title)}</p><button class="text-button profile-firm-link" data-firm-detail="${e(p.firm.id)}">${e(p.firm.name)} ↗</button></div></div><div class="profile-facts"><div><span class="fact-label">EDUCATION</span><span class="fact-value">${e(p.education || 'MBA, Stanford Graduate School of Business')}</span></div><div><span class="fact-label">LOCATION</span><span class="fact-value">${e(p.location || 'Not stated in reviewed sources')}</span></div></div>${p.relationshipNote?`<section class="dialog-section"><h3>Firm relationship</h3><p>${e(p.relationshipNote)}</p></section>`:''}<section class="dialog-section"><h3>The background</h3><p>${e(p.background)}</p></section><section class="dialog-section"><h3>Investment focus</h3><div class="sector-tags">${tags(p.sectorDetail || p.sectors)}</div>${p.sectorNote?`<p class="detail-muted">${e(p.sectorNote)}</p>`:''}</section><div class="detail-grid"><section class="dialog-section"><h3>Beyond the desk</h3><p class="${p.interests.length?'':'detail-muted'}">${p.interests.length?e(p.interests.join(' · ')):'Interests not stated in reviewed public sources.'}</p></section><section class="dialog-section"><h3>Professional contact</h3>${professionalContact(p,email)}</section></div><div class="dialog-actions"><button class="secondary-button dialog-save ${saved.has(p.id)?'saved':''}" data-save="${e(p.id)}" aria-pressed="${saved.has(p.id)}">${bookmarkIcon}${saved.has(p.id)?'Saved to shortlist':'Save to shortlist'}</button>${sources.length?`<a class="primary-button" href="${e(safeURL(sources[0].url))}" target="_blank" rel="noopener noreferrer">Read original bio ↗</a>`:''}${p.linkedin&&safeURL(p.linkedin)?`<a class="secondary-button" href="${e(safeURL(p.linkedin))}" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>`:''}</div><section class="dialog-section"><h3>The sources</h3>${sourceList(sources)}${p.photoNote?`<p class="detail-muted" style="margin-top:10px">${e(p.photoNote)}</p>`:''}<p class="detail-muted" style="margin-top:14px">Reviewed October 7, 2026. Current public biographies can lag role changes. Portraits belong to their respective owners.</p></section>`);
}
function firmDetail(id){
  const f=firms.find(f=>f.id===id);if(!f)return;
  const aumSource = f.aumSource ? [f.aumSource] : [];
  openDialog(`<div class="eyebrow">FIRM RESEARCH · ${f.rank?'AUM RANK '+f.rank:'AUM NOT RANKED'}</div><h2 id="dialog-title">${e(f.name)}</h2><p class="method-intro">${e(f.description)}</p><div class="profile-facts"><div><span class="fact-label">DISCLOSED AUM</span><span class="fact-value">${e(f.aumBillions===null?'Not disclosed on a comparable basis':f.aumDisplay)}</span></div><div><span class="fact-label">FIGURE / SOURCE DATE</span><span class="fact-value">${e(f.aumAsOf || 'Undated firm disclosure; reviewed October 7, 2026')}</span></div></div><section class="dialog-section"><h3>What the figure covers</h3><p>${e(f.aumBasis)}</p>${f.scopeNote?`<p style="margin-top:10px">${e(f.scopeNote)}</p>`:''}${sourceList(aumSource)}</section><section class="dialog-section"><h3>Firm investment focus</h3><div class="sector-tags">${tags(f.sectors)}</div></section><section class="dialog-section"><h3>GSB alumni coverage</h3><p>${f.people.length} publicly verified ${f.people.length===1?'profile':'profiles'}.</p><p class="detail-muted">${e(f.coverageNote || 'Public team pages and biographies were reviewed. Alumni identification is not exhaustive.')}</p></section><div class="dialog-actions"><button class="primary-button" data-firm-people="${e(f.id)}">Explore alumni ↗</button><a class="secondary-button" href="${e(safeURL(f.website))}" target="_blank" rel="noopener noreferrer">Visit firm website ↗</a></div>`);
}
function methodology(){
 openDialog(`<div class="eyebrow">A LITTLE CONTEXT GOES A LONG WAY</div><h2 id="dialog-title">Built on public evidence.</h2><p class="method-intro">An independent guide to Stanford GSB MBA alumni in US private equity. Every profile starts with a verifiable education and employment source.</p><ol class="method-list"><li><h3>A defined universe, not a definitive top 25</h3><p>We research ${firms.length} major US-based firms active in middle-market and upper-middle-market buyouts. UMM has no universal firm-level definition. This broad universe includes specialist firms and larger platforms that also invest above and below UMM; platform boundary cases are noted. It excludes the largest diversified megafund managers. Inclusion is editorial, not an investment recommendation.</p></li><li><h3>Rankings you can interpret</h3><p>Firms are sorted by the latest accessible disclosed assets under management, in US dollars. Most are firmwide disclosures; where unavailable, a named adviser’s regulatory AUM may be used and explicitly labeled. Adviser entity coverage can differ from the whole platform. These are not uniformly dated or limited to buyouts. Credit, real assets, affiliates, and acquisition effects may be included. A “+” is a reported lower bound. Cumulative capital raised or invested is not substituted for AUM. Firms without comparable disclosed AUM remain visible but unranked. See each firm's exact source, date, and basis.</p></li><li><h3>MBA graduates come first</h3><p>Profiles require a public source explicitly identifying a Stanford MBA or GSB degree and an affiliation in the firm's current public team materials. Stanford undergraduate degrees alone do not qualify. Other GSB degrees, if present, are separately labeled. A missing graduation year means the source does not state one. Partner and managing partner roles are included; an employment contract is not independently verified.</p></li><li><h3>Useful detail, without filling in the blanks</h3><p>Backgrounds are paraphrased from cited biographies. Sector focus is taken from personal responsibilities when available; firm-level focus is labeled when used. Interests appear only if publicly stated. Professional emails are copied from cited company publications, public filings, or publicly accessible third-party directory listings. Source types and historical evidence are labeled. Directory listings are not firm confirmation; none of the addresses have been tested for deliverability. Masked addresses, personal emails, and guessed patterns are excluded. Missing portraits use initials.</p></li><li><h3>A researched snapshot, with honest limits</h3><p>Research was reviewed October 7, 2026. Team pages, biographies, and search results can be incomplete or stale, and private alumni records are not available. This is not a certified list of every graduate. Zero identified profiles means none were verified in this research pass, not that none exist. AUM source dates may precede the research date.</p></li><li><h3>Your shortlist stays with you</h3><p>Bookmarks are stored in this browser's local storage. There are no accounts, analytics, or server-side contact collection. Portraits may load from their original firm websites, and fonts from Google Fonts. Exports reflect your current filters. Sources and portraits retain their owners' rights. GSB Atlas is not affiliated with Stanford or any listed firm.</p></li></ol><div class="dialog-actions"><a class="primary-button" href="data/atlas.json" download>Download research data ↓</a><a class="secondary-button" href="https://github.com/dev1niscool/GSB_Atlas" target="_blank" rel="noopener noreferrer">View the repository ↗</a></div>`);
}
function exportResults(){
 const isFirm=state.view==='firms';
 const headers=isFirm?['AUM rank in universe','Firm','Headquarters','Disclosed AUM (USD billions)','AUM label','Source date','AUM basis','AUM scope note','AUM source','Identified alumni','Website']:['Name','Title','Firm','Location','GSB degree','Graduation year','Education','Investment focus','Detailed investment focus','Sector basis','Firm relationship','Background','Interests','Public professional email','Email source','Email context','Email source type','Email reviewed','Email research status','Photo source','Profile sources','Research reviewed'];
 const rows=currentItems.map(p=>isFirm?[p.rank??'',p.name,p.headquarters,p.aumBillions??'',p.aumDisplay,p.aumAsOf,p.aumBasis,p.scopeNote,p.aumSource?.url,p.people.length,p.website]:[p.name,p.title,p.firm.name,p.location,p.degree,p.gradYear??'',p.education,p.sectors.join('; '),(p.sectorDetail||p.sectors).join('; '),p.sectorNote||'',p.relationshipNote||'',p.background,p.interests.join('; '),p.email??'',typeof p.emailSource==='string'?p.emailSource:p.emailSource?.url,p.emailNote||'',p.email?emailSourceLabel(p):'',p.emailReviewedAt||'',p.emailResearch||'',typeof p.photoSource==='string'?p.photoSource:p.photoSource?.url,profileSources(p).map(s=>s.url).join(' | '),'2026-10-07']);
 const csvCell=x=>'"'+String(x??'').replace(/^[=+\-@\t\r]/,"'$&").replace(/"/g,'""')+'"';
 const csv='\uFEFF'+[headers,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),a=document.createElement('a');a.href=url;a.download=`gsb-atlas-${state.view}-2026-10-07.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);notify(`Exported ${rows.length} ${isFirm?'firms':'profiles'} with sources`);
}
function wireEvents(){
 document.addEventListener('click',async event=>{
  const target=event.target.closest('button,a');if(!target)return;
  if(target.dataset.view){if(target.tagName==='A')event.preventDefault();setView(target.dataset.view);$('#directory').scrollIntoView({behavior:'smooth',block:'start'});}
  if(target.dataset.save)saveProfile(target.dataset.save);
  if(target.dataset.profile)profileDetail(target.dataset.profile);
  if(target.dataset.firmDetail)firmDetail(target.dataset.firmDetail);
  if(target.dataset.firmPeople){state.firm=target.dataset.firmPeople;state.query='';state.sectors.clear();state.email=false;state.view='people';syncControls();render();$('#detail-dialog').close();$('#directory').scrollIntoView({behavior:'smooth'});}
  if(target.dataset.removeFilter){const t=target.dataset.removeFilter;if(t==='firm')state.firm='';if(t==='email')state.email=false;if(t==='sector')state.sectors.delete(target.dataset.value);syncControls();render();}
  if(target.dataset.copyEmail){try{await navigator.clipboard.writeText(target.dataset.copyEmail);notify('Professional email copied');}catch{notify('Copy unavailable. Select the email address to copy it.');}}
  if(target.dataset.action==='methodology')methodology();
  if(target.dataset.action==='close-dialog')$('#detail-dialog').close();
  if(target.dataset.action==='reset-all'){state.view='people';resetFilters();}
 });
 $('#search').addEventListener('input',event=>{state.query=event.target.value;render();});
 $('#firm-filter').addEventListener('change',event=>{state.firm=event.target.value;render();});
 $('#email-filter').addEventListener('change',event=>{state.email=event.target.checked;render();});
 $('#sector-filters').addEventListener('change',event=>{const s=event.target.dataset.sector;if(!s)return;if(event.target.checked)state.sectors.add(s);else state.sectors.delete(s);syncControls();render();});
 $('#mobile-sector-filter').addEventListener('change',event=>{state.sectors.clear();if(event.target.value)state.sectors.add(event.target.value);syncControls();render();});
 $('#sort').addEventListener('change',event=>{state.sort=event.target.value;render();});
 $('#reset-filters').addEventListener('click',resetFilters);
 $('#export-button').addEventListener('click',exportResults);
 $('#detail-dialog').addEventListener('click',event=>{if(event.target===$('#detail-dialog')){const rect=event.target.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)event.target.close();}});
 document.addEventListener('keydown',event=>{if(event.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&!$('#detail-dialog').open){event.preventDefault();$('#search').focus();}if(['ArrowRight','ArrowLeft','Home','End'].includes(event.key)&&document.activeElement.classList.contains('view-tab')){event.preventDefault();const tabs=$$('.view-tab');const index=tabs.indexOf(document.activeElement);const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;setView(tabs[next].dataset.view);tabs[next].focus();}});
 document.addEventListener('error',event=>{if(event.target.matches?.('img[data-portrait]')){const p=people.find(p=>p.id===event.target.dataset.portrait);const div=document.createElement('div');div.className='portrait-placeholder';div.setAttribute('role','img');div.setAttribute('aria-label',`Portrait unavailable for ${p?.name||'this person'}`);div.innerHTML=`<span>${e(initials(p?.name||''))}</span><small>Portrait unavailable</small>`;event.target.replaceWith(div);}},true);
}
async function init(){
 wireEvents();
 try{
  const response=await fetch('data/atlas.json');if(!response.ok)throw new Error('Research data could not be loaded');data=await response.json();
  firms=data.firms.sort((a,b)=>(b.aumBillions??-1)-(a.aumBillions??-1)||a.name.localeCompare(b.name));
  let rank=0;firms.forEach(f=>{f.rank=f.aumBillions===null?null:++rank;f.people=f.people || [];});
  people=firms.flatMap(f=>f.people.map(p=>({...p,firm:f,sectors:p.sectors||[],interests:p.interests||[]})));
  saved=new Set([...saved].filter(id=>people.some(p=>p.id===id)));
  const sectors=[...new Set(people.flatMap(p=>p.sectors))].sort();
  $('#email-count').textContent=people.filter(p=>p.email).length;
  $('#firm-stat').textContent=firms.length;$('#people-stat').textContent=people.length;$('#sector-stat').textContent=sectors.length;$('#people-tab-count').textContent=people.length;
  $('#firm-filter').innerHTML='<option value="">All firms</option>'+[...firms].sort((a,b)=>a.name.localeCompare(b.name)).map(f=>`<option value="${e(f.id)}">${e(f.name)}</option>`).join('');
  $('#mobile-sector-filter').innerHTML='<option value="">All investment sectors</option>'+sectors.map(s=>`<option value="${e(s)}">${e(s)}</option>`).join('');
  $('#sector-filters').innerHTML=sectors.map(s=>`<label class="check-label"><input type="checkbox" data-sector="${e(s)}"><span>${e(s)}</span><span class="sector-count">${people.filter(p=>p.sectors.includes(s)).length}</span></label>`).join('');
  syncControls();
  render();
 }catch(error){$('#export-button').disabled=true;$('#results-summary').textContent='Directory unavailable';$('#results').innerHTML='<div class="empty-state glass"><h3>We couldn’t load the research.</h3><p>Please refresh the page to try again.</p><a class="primary-button" href=".">Reload directory ↻</a></div>';console.error(error);}
}
init();

// ════════════════════════════════════════
// PROMPTFORGE — SHARED AUTH & UTILITIES
// Included on every page for consistent auth state, credits, nav
// ════════════════════════════════════════

const SUPABASE_URL = 'https://ytkgkehcicdnbugcmqib.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xqfj4ZzUnfniXWNYLFbcNA_Lt44bWEE';
const WORKER_URL = 'https://promptforge-api.umejesistephen85.workers.dev/';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentProfile = null;

async function loadCurrentUser(){
  const {data:{user}} = await sb.auth.getUser();
  currentUser = user;
  if(user){
    const {data} = await sb.from('profiles').select('*').eq('id', user.id).single();
    currentProfile = data;
  }
  updateAuthUI();
  return {user, profile: currentProfile};
}

function updateAuthUI(){
  // Each page implements its own rendering, but this updates common
  // elements that exist across pages (credit display, avatar initials)
  document.querySelectorAll('[data-credits]').forEach(el=>{
    el.textContent = currentProfile ? currentProfile.credits : '—';
  });
  document.querySelectorAll('[data-user-name]').forEach(el=>{
    el.textContent = currentProfile ? currentProfile.display_name : 'Guest';
  });
  document.querySelectorAll('[data-user-initials]').forEach(el=>{
    el.textContent = currentProfile ? currentProfile.display_name.slice(0,2).toUpperCase() : '?';
  });
  document.querySelectorAll('[data-tier]').forEach(el=>{
    el.textContent = currentProfile?.tier === 'premium' ? 'Premium' : 'Free';
  });
  // Redirect logged-out users away from protected pages
  if(document.body.dataset.requiresAuth === 'true' && !currentUser){
    window.location.href = '/index.html';
  }
}

function toast(msg){
  let t = document.getElementById('toast');
  if(!t){
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>t.classList.remove('on'), 3200);
}

function toggleSidebar(){
  document.getElementById('sidebar')?.classList.toggle('open');
}

async function handleLogout(){
  await sb.auth.signOut();
  window.location.href = '/index.html';
}

async function callAI(prompt){
  const res = await fetch(WORKER_URL,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({prompt})
  });
  if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error||'Generation failed')}
  const d = await res.json();
  return d.result || d.text || '';
}

async function callImageAPI(prompt, qualityTier, style){
  const {data:{session}} = await sb.auth.getSession();
  if(!session) throw new Error('Please sign in again');
  const res = await fetch(WORKER_URL + 'generate-image', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ prompt, accessToken: session.access_token, qualityTier, style })
  });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error || 'Generation failed');
  return data;
}

// Run on every page load
loadCurrentUser();

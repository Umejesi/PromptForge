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
  // elements that exist across pages (usage display, avatar initials)
  document.querySelectorAll('[data-prompts-used]').forEach(el=>{
    el.textContent = currentProfile ? (currentProfile.prompts_used_this_month||0) : '—';
  });
  document.querySelectorAll('[data-user-name]').forEach(el=>{
    el.textContent = currentProfile ? currentProfile.display_name : 'Guest';
  });
  document.querySelectorAll('[data-user-initials]').forEach(el=>{
    el.textContent = currentProfile ? currentProfile.display_name.slice(0,2).toUpperCase() : '?';
  });
  document.querySelectorAll('[data-tier]').forEach(el=>{
    const isPremium = currentProfile?.tier === 'premium' || currentProfile?.is_premium;
    el.textContent = isPremium ? 'Premium' : 'Free';
  });

  // Public pages (Home, Premium, About, Support) show a "Sign in / Join
  // Free" button pair when logged out — swap this for an avatar + sign out
  // once a real session exists, so the nav never lies about login state.
  document.querySelectorAll('.pub-right').forEach(el=>{
    if(currentUser && currentProfile){
      el.innerHTML = `
        <span style="font-size:13px;color:var(--txt2);margin-right:4px">Hi, ${escapeHtmlShared(currentProfile.display_name)}</span>
        <button class="btn-ghost" onclick="handleLogout()">Sign out</button>
      `;
    } else if(!el.dataset.authBound){
      // Only restore default markup once, so we don't clobber a page's
      // custom buttons if it's already showing the logged-out state.
      el.dataset.authBound = 'checked';
    }
  });

  // Redirect logged-out users away from protected pages
  if(document.body.dataset.requiresAuth === 'true' && !currentUser){
    window.location.href = 'index.html';
  }
}

function escapeHtmlShared(s){
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

function togglePubMobileNav(){
  document.getElementById('pubMobileDrawer')?.classList.toggle('open');
  document.getElementById('pubMobileOverlay')?.classList.toggle('open');
}
function closePubMobileNav(){
  document.getElementById('pubMobileDrawer')?.classList.remove('open');
  document.getElementById('pubMobileOverlay')?.classList.remove('open');
}

const FREE_MONTHLY_PROMPT_LIMIT = 10;

// Checks the limit BEFORE generating, and resets the monthly counter if a
// new calendar month has started. Returns true if generation is allowed.
async function checkPromptLimit(){
  if(!currentUser){ toast('Sign in to generate prompts'); openLogin(); return false; }
  const isPremium = currentProfile?.tier === 'premium' || currentProfile?.is_premium;
  if(isPremium) return true;

  const today = new Date();
  const thisMonth = today.toISOString().slice(0,7);
  const resetMonth = (currentProfile?.month_reset_date || '').slice(0,7);

  if(thisMonth !== resetMonth){
    // New month — reset the counter
    await sb.from('profiles').update({
      prompts_used_this_month: 0,
      month_reset_date: today.toISOString().slice(0,10)
    }).eq('id', currentUser.id);
    currentProfile.prompts_used_this_month = 0;
    currentProfile.month_reset_date = today.toISOString().slice(0,10);
  }

  const used = currentProfile?.prompts_used_this_month || 0;
  if(used >= FREE_MONTHLY_PROMPT_LIMIT){
    toast(`⚠️ You've used all ${FREE_MONTHLY_PROMPT_LIMIT} free prompts this month. Upgrade for unlimited.`);
    return false;
  }
  return true;
}

// Call this AFTER a successful generation to increment the counter
async function recordPromptUsage(category, content){
  if(!currentUser) return;
  const isPremium = currentProfile?.tier === 'premium' || currentProfile?.is_premium;
  if(!isPremium){
    const newCount = (currentProfile?.prompts_used_this_month || 0) + 1;
    await sb.from('profiles').update({prompts_used_this_month: newCount}).eq('id', currentUser.id);
    currentProfile.prompts_used_this_month = newCount;
  }
  await sb.from('prompt_generations').insert({
    user_id: currentUser.id, category, content
  });
  updateAuthUI();
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
  window.location.href = 'index.html';
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

// Run on every page load
loadCurrentUser();

// ════════════════════════════════════════
// AUTH MODAL — lives in index.html (the gate) only.
// Other pages redirect there so there's exactly ONE modal implementation
// across the whole site (with working Google/Discord OAuth), instead of
// two competing copies that silently override each other's functions.
// ════════════════════════════════════════
function openLogin(){
  if(document.getElementById('authOverlay')){
    // We're on index.html itself — its own openAuth() already exists
    // and is the real implementation; just call it directly.
    if(typeof openAuth === 'function'){ openAuth('login'); return; }
  }
  window.location.href = 'index.html';
}

  if(!name||!email||!pass){toast('⚠️ Fill in all fields');return}
  if(pass.length<8){toast('⚠️ Password must be 8+ characters');return}
// ════════════════════════════════════════
// ADSTERRA SOCIAL BAR — auto-loads on every page
// ════════════════════════════════════════
(function injectSocialBar(){
  const s = document.createElement('script');
  s.src = 'https://pl29817634.effectivecpmnetwork.com/48/0e/ca/480eca4f5cb7d5496be8a9ad3932cbc4.js';
  document.body.appendChild(s);
})();

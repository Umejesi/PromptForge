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

// ════════════════════════════════════════
// SHARED AUTH MODAL — auto-injected on every page
// ════════════════════════════════════════
function injectAuthModal(){
  if(document.getElementById('authModalOverlay')) return; // already injected
  const div = document.createElement('div');
  div.innerHTML = `
    <div class="modal-overlay" id="authModalOverlay">
      <div class="modal-box">
        <div class="modal-close" onclick="closeLogin()">✕</div>
        <div class="modal-logo">⚡ PromptForge</div>
        <div class="modal-tagline">Join 12,000+ prompt engineers</div>
        <div class="modal-tabs">
          <div class="modal-tab on" id="tabLogin" onclick="switchAuthTab('login')">Sign in</div>
          <div class="modal-tab" id="tabSignup" onclick="switchAuthTab('signup')">Create account</div>
        </div>
        <div id="loginForm">
          <div class="modal-field"><label>Email</label><input class="modal-input" type="email" id="loginEmail" placeholder="you@example.com"></div>
          <div class="modal-field"><label>Password</label><input class="modal-input" type="password" id="loginPass" placeholder="••••••••"></div>
          <button class="btn-modal-submit" onclick="handleLoginSubmit()">Sign in →</button>
        </div>
        <div id="signupForm" style="display:none">
          <div class="modal-field"><label>Display name</label><input class="modal-input" type="text" id="signupName" placeholder="Your name"></div>
          <div class="modal-field"><label>Email</label><input class="modal-input" type="email" id="signupEmail" placeholder="you@example.com"></div>
          <div class="modal-field"><label>Password</label><input class="modal-input" type="password" id="signupPass" placeholder="Min. 8 characters"></div>
          <button class="btn-modal-submit" onclick="handleSignupSubmit()">Create account →</button>
        </div>
        <div class="modal-note">By continuing, you agree to our Terms & Privacy Policy.</div>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  document.getElementById('authModalOverlay').addEventListener('click', e=>{
    if(e.target.id === 'authModalOverlay') closeLogin();
  });
}

function openLogin(){
  injectAuthModal();
  document.getElementById('authModalOverlay').classList.add('open');
}
function closeLogin(){
  document.getElementById('authModalOverlay')?.classList.remove('open');
}
function switchAuthTab(tab){
  document.getElementById('tabLogin').classList.toggle('on', tab==='login');
  document.getElementById('tabSignup').classList.toggle('on', tab==='signup');
  document.getElementById('loginForm').style.display = tab==='login' ? '' : 'none';
  document.getElementById('signupForm').style.display = tab==='signup' ? '' : 'none';
}
async function handleLoginSubmit(){
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  if(!email||!pass){toast('⚠️ Fill in all fields');return}
  const {error} = await sb.auth.signInWithPassword({email, password:pass});
  if(error){toast('❌ '+error.message);return}
  toast('✅ Signed in!');
  await loadCurrentUser();
  closeLogin();
  if(window.onAuthSuccess) window.onAuthSuccess();
}
async function handleSignupSubmit(){
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const pass = document.getElementById('signupPass').value;
  if(!name||!email||!pass){toast('⚠️ Fill in all fields');return}
  if(pass.length<8){toast('⚠️ Password must be 8+ characters');return}
  const {error} = await sb.auth.signUp({email, password:pass, options:{data:{display_name:name}}});
  if(error){toast('❌ '+error.message);return}
  toast('🎉 Account created!');
  await loadCurrentUser();
  closeLogin();
  if(window.onAuthSuccess) window.onAuthSuccess();
}

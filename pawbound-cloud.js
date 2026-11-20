/* Pawbound v4.8: Supabase Auth, email preference, and manual private backups.
   This client uses ONLY the public publishable API key. All private rows require RLS. */
const SUPABASE_URL='https://fjpupvhwqlbjzggbplud.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_eNVxI4dOZ_D45-hvsxDEIg_p5elwNv2';
const BACKUP_KEYS=['pet-travel-prototype-v1','pet-travel-v08-extras','pet-travel-adventures-v1','pet-travel-pet-budgets-v1','pet-travel-carrier-dimensions-v1','pet-travel-preferred-currency-v1','pawbound-saved-packing-lists-v1'];
const LOCAL_OWNER_KEY='pawbound-v48-local-owner';
const MARKETING_VERSION='pawbound-updates-v1-2026-11-20';
const $=id=>document.getElementById(id);
const authForm=$('pbCloudAuthForm'),signedIn=$('pbCloudSignedIn');
const status=$('pbCloudStatus');
const msg=text=>{if(status)status.textContent=text};
const safeError=e=>String(e?.message||e||'Unknown error').replace(/sb_publishable_[\w-]+/g,'[key]');
let client=null,user=null,busy=false,identityRevision=0;
window.PawboundCloudReady=false;window.PawboundCloudError=null;
function collect(){const items={};for(const key of BACKUP_KEYS){const v=localStorage.getItem(key);if(v!==null)items[key]=v}return {product:'Pawbound',format:'pawbound-local-backup-v1',createdAt:new Date().toISOString(),items}}
function validateBackup(data){if(data?.product!=='Pawbound'||data?.format!=='pawbound-local-backup-v1'||!data?.items||typeof data.items!=='object'||Array.isArray(data.items))throw Error('Cloud data is not a supported Pawbound backup');
 const entries=Object.entries(data.items);if(!entries.length||entries.some(([k,v])=>!BACKUP_KEYS.includes(k)||typeof v!=='string'))throw Error('Backup contains unexpected or missing data');
 for(const [key,val] of entries){if(key!=='pet-travel-preferred-currency-v1')JSON.parse(val)}return entries;}
function emitIdentity(u){window.PawboundCloudIdentity={signedIn:!!u,email:u?.email||'',id:u?.id||null};document.dispatchEvent(new CustomEvent('pawbound:auth-state',{detail:window.PawboundCloudIdentity}));}
function emitError(message){window.PawboundCloudError=safeError(message);document.dispatchEvent(new CustomEvent('pawbound:auth-error',{detail:{message:window.PawboundCloudError}}));}
/* On a shared browser, move the old member's saved local records out of the active app keys before showing another account.
   This reduces accidental cross-account mixing; browser storage is NOT encrypted. */
function switchLocalOwner(nextId){
 const currentId=localStorage.getItem(LOCAL_OWNER_KEY);
 if(!currentId){localStorage.setItem(LOCAL_OWNER_KEY,nextId);return false} // adopt pre-v4.8 local records for first member
 if(currentId===nextId)return false;
 const oldData={};for(const key of BACKUP_KEYS){const value=localStorage.getItem(key);if(value!==null)oldData[key]=value}
 const nextRaw=localStorage.getItem('pawbound-v48-local-data-'+nextId);
 let nextData={};if(nextRaw){try{nextData=JSON.parse(nextRaw)}catch{throw Error('Local member data is damaged. Do not switch accounts until it is backed up.')}}
 // Store the previous account FIRST. If quota is exceeded, keep the current data unchanged.
 localStorage.setItem('pawbound-v48-local-data-'+currentId,JSON.stringify(oldData));
 for(const key of BACKUP_KEYS)localStorage.removeItem(key);
 try{for(const [key,value] of Object.entries(nextData))if(BACKUP_KEYS.includes(key)&&typeof value==='string')localStorage.setItem(key,value)}
 catch(e){for(const key of BACKUP_KEYS)localStorage.removeItem(key);for(const [key,value] of Object.entries(oldData))localStorage.setItem(key,value);throw e}
 localStorage.setItem(LOCAL_OWNER_KEY,nextId);
 location.reload();return true;
}
function signedInUI(current){user=current||null;if(authForm)authForm.hidden=!!user;if(signedIn)signedIn.hidden=!user;
 if($('pbCloudUser'))$('pbCloudUser').textContent=user?.email||'';
 if($('pbCloudEmail'))$('pbCloudEmail').value='';if($('pbCloudPassword'))$('pbCloudPassword').value='';
 if($('pbCloudRestoreAck'))$('pbCloudRestoreAck').checked=false;
 if(user){msg('Signed in. Your cloud backup stays optional and manual.');refreshCloudDate();refreshMarketing()}
 else{msg('Not signed in. Your records remain on this device until you sign in.');if($('pbCloudLastSaved'))$('pbCloudLastSaved').textContent='No cloud backup checked yet.'}
 emitIdentity(user);
}
async function acceptVerifiedUser(verified){if(!verified?.id){signedInUI(null);return}
 try{if(switchLocalOwner(verified.id))return}catch(e){emitError('Could not safely switch local pet records: '+safeError(e));return}
 signedInUI(verified);
}
async function refreshCloudDate(){if(!client||!user)return;const activeId=user.id;
 const {data,error}=await client.from('pawbound_backups').select('updated_at').eq('user_id',activeId).maybeSingle();if(activeId!==user?.id)return;
 $('pbCloudLastSaved').textContent=error?'Cloud storage problem: '+safeError(error):data?.updated_at?'Last cloud backup: '+new Date(data.updated_at).toLocaleString():'No cloud backup saved yet.'}
async function refreshMarketing(){if(!client||!user)return;const activeId=user.id;
 const {data,error}=await client.from('pawbound_marketing_preferences').select('opted_in').eq('user_id',activeId).maybeSingle();if(activeId!==user?.id)return;
 if(error){$('pbCloudMarketingStatus').textContent='Could not load email preference: '+safeError(error);return}
 $('pbCloudMarketing').checked=!!data?.opted_in;
 $('pbCloudMarketingStatus').textContent=data?.opted_in?'You are subscribed to optional Pawbound updates. You can opt out anytime.':'You are not subscribed to promotional emails.';
}
function readyClient(){if(!client)throw Error('Secure account service has not connected yet. Check your internet connection and retry.');return client}
async function signIn(email,password){const c=readyClient();const {data,error}=await c.auth.signInWithPassword({email,password});if(error)throw error;
 const {data:verified,result,error:checkError}=await c.auth.getUser();if(checkError||!verified?.user)throw checkError||Error('Unable to verify your sign-in.');
 await acceptVerifiedUser(verified.user);return data}
async function signUp(email,password,updates){const c=readyClient();const {data,error}=await c.auth.signUp({email,password,options:{
 emailRedirectTo:location.origin+location.pathname,data:{pawbound_marketing_opt_in:updates===true,pawbound_marketing_notice_version:MARKETING_VERSION}}});
 if(error)throw error;if(data.session?.user){const {data:v,error:e}=await c.auth.getUser();if(e||!v?.user)throw e||Error('Could not confirm account.');await acceptVerifiedUser(v.user)}
 return {needsConfirmation:!data.session};}
async function signOut(){const c=readyClient();const {error}=await c.auth.signOut();if(error)throw error;signedInUI(null)}
async function resetPassword(email){const c=readyClient();const {error}=await c.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});if(error)throw error;}
async function changeMarketing(optedIn){const c=readyClient();if(!user)throw Error('Sign in first.');
 const {error}=await c.from('pawbound_marketing_preferences').upsert({user_id:user.id,opted_in:optedIn===true,consent_source:'account_settings',consent_notice_version:MARKETING_VERSION},{onConflict:'user_id'});
 if(error)throw error;await refreshMarketing();}
window.PawboundCloud={signIn,signUp,signOut,resetPassword,changeMarketing};
async function action(run){if(busy)return;busy=true;
 for(const b of ['pbCloudSignIn','pbCloudCreate','pbCloudSave','pbCloudRestore','pbCloudSignOut','pbCloudMarketingSave','pbCloudChangePassword'])if($(b))$(b).disabled=true;
 try{await run()}catch(e){msg(safeError(e))}finally{busy=false;for(const b of ['pbCloudSignIn','pbCloudCreate','pbCloudSave','pbCloudRestore','pbCloudSignOut','pbCloudMarketingSave','pbCloudChangePassword'])if($(b))$(b).disabled=false}}
function fields(){const email=$('pbCloudEmail').value.trim(),password=$('pbCloudPassword').value;
 if(!email||!password)throw Error('Enter an email address and password.');if(password.length<8)throw Error('Use at least 8 characters.');return {email,password}}
if(authForm)authForm.addEventListener('submit',e=>{e.preventDefault();action(async()=>{const {email,password}=fields();await signIn(email,password);msg('Signed in to Pawbound.')})});
if($('pbCloudCreate'))$('pbCloudCreate').onclick=()=>action(async()=>{const {email,password}=fields();const r=await signUp(email,password,false);
 msg(r.needsConfirmation?'Check your inbox for a confirmation email, then sign in.':'Welcome to Pawbound!')});
if($('pbCloudSignOut'))$('pbCloudSignOut').onclick=()=>action(async()=>{await signOut();msg('Signed out. Sign in to access Pawbound again.')});
if($('pbCloudMarketingSave'))$('pbCloudMarketingSave').onclick=()=>action(async()=>{await changeMarketing($('pbCloudMarketing').checked);msg('Email preference saved.')});
if($('pbCloudChangePassword'))$('pbCloudChangePassword').onclick=()=>action(async()=>{
 if(!user)throw Error('Sign in first.');const password=$('pbCloudNewPassword').value;
 if(password.length<8)throw Error('Use a new password with at least eight characters.');
 const {error}=await readyClient().auth.updateUser({password});if(error)throw error;
 $('pbCloudNewPassword').value='';$('pbCloudPasswordStatus').textContent='Password updated successfully.';
});
if($('pbCloudSave'))$('pbCloudSave').onclick=()=>action(async()=>{if(!user)throw Error('Sign in first.');const backup=collect();validateBackup(backup);const size=new Blob([JSON.stringify(backup)]).size;
 if(size>6*1024*1024)throw Error('Backup exceeds the 6 MB beta limit. Download a local backup first, or remove large photos.');
 if(!confirm('Save your pet records, documents, health notes, and trips to your private Supabase account? This replaces your previous cloud copy.'))return;
 msg('Saving your private cloud copy…');const {error}=await client.from('pawbound_backups').upsert({user_id:user.id,backup,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)throw error;
 msg('Cloud copy saved successfully.');await refreshCloudDate()});
if($('pbCloudRestore'))$('pbCloudRestore').onclick=()=>action(async()=>{if(!user)throw Error('Sign in first.');if(!$('pbCloudRestoreAck').checked)throw Error('Download a backup of this device first, then check the acknowledgement.');
 msg('Reading your cloud copy…');const {data,error}=await client.from('pawbound_backups').select('backup,updated_at').eq('user_id',user.id).maybeSingle();if(error)throw error;
 if(!data?.backup)throw Error('No cloud backup saved to your account yet.');const entries=validateBackup(data.backup);
 if(!confirm('Restore your cloud copy from '+new Date(data.updated_at).toLocaleString()+'? This REPLACES local sections for this signed-in account.'))return;
 const old=Object.fromEntries(entries.map(([key])=>[key,localStorage.getItem(key)]));
 try{for(const [key,value] of entries)localStorage.setItem(key,value)}catch(e){for(const [key,v] of Object.entries(old)){try{if(v===null)localStorage.removeItem(key);else localStorage.setItem(key,v)}catch{}}throw e}
 msg('Cloud copy restored. Reloading Pawbound…');location.reload()});
async function syncSession(session){const rev=++identityRevision;if(!session){signedInUI(null);return}
 const {data,error}=await client.auth.getUser();if(rev!==identityRevision)return;
 if(error||!data?.user){signedInUI(null);emitError('Your session could not be verified. Please sign in again.');return}
 await acceptVerifiedUser(data.user);}
async function init(){if(!status)return;const secure=location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1';
 if(!secure){emitError('Open Pawbound from its HTTPS Netlify address to create or access an account.');return}
 try{const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2?bundle');
 client=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
 client.auth.onAuthStateChange((event,session)=>{if(event==='INITIAL_SESSION')return;
 if(event==='SIGNED_OUT')setTimeout(()=>{++identityRevision;signedInUI(null)},0);
 else if(['SIGNED_IN','TOKEN_REFRESHED','USER_UPDATED'].includes(event))setTimeout(()=>syncSession(session).catch(e=>emitError(e)),0);
 if(event==='PASSWORD_RECOVERY')setTimeout(()=>document.dispatchEvent(new Event('pawbound:password-recovery')),0);
 });
 const {data,error}=await client.auth.getSession();if(error)throw error;
 if(data?.session)await syncSession(data.session);else signedInUI(null);
 window.PawboundCloudReady=true;window.PawboundCloudError=null;document.dispatchEvent(new Event('pawbound:auth-ready'));
 }catch(e){msg('Could not connect to Pawbound accounts: '+safeError(e));emitError('Secure sign-in is unavailable: '+safeError(e))}}
init();

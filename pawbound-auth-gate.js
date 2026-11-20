/* Pawbound v4.8 — login required before app UI is shown.
   This is an interface gate on a static site; private data security is enforced by Supabase RLS. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const gate=$('pbAuthGate'),form=$('pbGateForm'),email=$('pbGateEmail'),password=$('pbGatePassword');
if(!gate||!form)return;
let mode='signup',ready=!!window.PawboundCloudReady,busy=false,verified=false;
function message(text,kind=''){const el=$('pbGateStatus');el.textContent=text;el.className='pb-gate-status'+(kind?' '+kind:'')}
function render(){const join=mode==='signup';$('pbGateModeSignup').classList.toggle('active',join);$('pbGateModeSignin').classList.toggle('active',!join);
 $('pbGateModeSignup').setAttribute('aria-pressed',String(join));$('pbGateModeSignin').setAttribute('aria-pressed',String(!join));
 $('pbGateHeading').textContent=join?'Join the adventure.':'Welcome back!';
 $('pbGateDescription').textContent=join?'Create your free account to explore pet-travel guides, plan trips and keep track of your travel companions.':'Sign in to continue your pet adventures.';
 $('pbGateSignupChoices').hidden=!join;$('pbGateTerms').required=join;
 password.autocomplete=join?'new-password':'current-password';$('pbGateForgot').hidden=join;
 $('pbGateSubmit').textContent=busy?(join?'Creating account…':'Signing in…'):join?'Create my free account':'Sign in to Pawbound';
 $('pbGateSubmit').disabled=!ready||busy;}
function lock(){verified=false;document.body.classList.add('pb-locked');gate.hidden=false;}
function unlock(){verified=true;gate.hidden=true;document.body.classList.remove('pb-locked');}
function switchMode(next){mode=next;password.value='';render();message(ready?'':'Checking secure connection…');}
$('pbGateModeSignup').addEventListener('click',()=>switchMode('signup'));
$('pbGateModeSignin').addEventListener('click',()=>switchMode('signin'));
$('pbGateRetry').addEventListener('click',()=>location.reload());
$('pbGateForgot').addEventListener('click',async()=>{
 const address=email.value.trim();if(!address||!email.checkValidity()){message('Enter your email address to receive a password-reset link.','error');email.focus();return}
 if(!window.PawboundCloud){message('Connection not ready. Try again.','error');return}
 $('pbGateForgot').disabled=true;
 try{await window.PawboundCloud.resetPassword(address);message('If an account exists, check that email for a password-reset link.','success')}
 catch(e){message(e.message||'Could not send reset link.','error')}
 finally{$('pbGateForgot').disabled=false}
});
form.addEventListener('submit',async e=>{
 e.preventDefault();if(!ready||busy||!window.PawboundCloud)return;
 if(!email.checkValidity()){message('Enter a valid email address.','error');email.focus();return}
 if(password.value.length<8){message('Use a password of at least eight characters.','error');password.focus();return}
 if(mode==='signup'&&!$('pbGateTerms').checked){message('Please agree to the Terms and review Privacy information.','error');return}
 busy=true;render();message('Connecting to Pawbound…');
 try{if(mode==='signup'){
  const result=await window.PawboundCloud.signUp(email.value.trim(),password.value,$('pbGateMarketing').checked);
  password.value='';if(result.needsConfirmation){switchMode('signin');message('Account created! Check your email for the confirmation link, then return and sign in.','success')}
  else message('Welcome to Pawbound!','success');
 }else{await window.PawboundCloud.signIn(email.value.trim(),password.value);password.value='';message('Welcome back!','success')}
 }catch(err){message(String(err?.message||err||'Please try again.'),'error')}
 finally{busy=false;render()}
});
document.addEventListener('pawbound:auth-ready',()=>{ready=true;$('pbGateRetry').hidden=true;render();if(!verified)message('Create an account or sign in to continue.')});
document.addEventListener('pawbound:auth-error',e=>{ready=false;lock();render();message(e.detail?.message||'Unable to reach the sign-in service. Please reconnect and retry.','error');$('pbGateRetry').hidden=false});
document.addEventListener('pawbound:auth-state',e=>{const detail=e.detail||{};
 if(detail.signedIn)unlock();else{lock();if(ready)message('Sign in or create a free account to continue.')}
});
if(window.PawboundCloudIdentity?.signedIn)unlock();else lock();
if(window.PawboundCloudError){message(window.PawboundCloudError,'error');$('pbGateRetry').hidden=false}
else if(ready)message('Create an account or sign in to continue.');
render();
})();
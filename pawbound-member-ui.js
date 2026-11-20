/* Pawbound v4.8: member-only navigation; no guest invitations or guest bypass. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
function update(d){if(!d?.signedIn)return;
 $('pbMenuAccountTitle').textContent='Welcome back to Pawbound';
 $('pbMenuAccountDetail').textContent=d.email?`Signed in as ${d.email}`:'Your member account is ready.';
 $('pbMenuJoin').textContent='My account & backups';
 $('pbMenuExplore').textContent='Browse guides';}
$('pbMenuJoin')?.addEventListener('click',()=>{
 const btn=document.querySelector('#appMenu [data-open="settings"]');if(btn)btn.click();
 setTimeout(()=>$('pbCloud')?.scrollIntoView({behavior:'smooth',block:'start'}),70)});
$('pbMenuExplore')?.addEventListener('click',()=>{
 const btn=document.querySelector('#appMenu [data-open="rules"]');if(btn)btn.click()});
document.addEventListener('pawbound:auth-state',e=>update(e.detail));
document.addEventListener('pawbound:password-recovery',()=>{
 // Supabase recovery links grant a temporary authenticated session; prompt to set a new password.
 let tries=0;const guide=()=>{if(!window.PawboundCloudIdentity?.signedIn){if(++tries<12)setTimeout(guide,250);return}
 const nav=document.querySelector('#appMenu [data-open="settings"]');if(nav)nav.click();
 setTimeout(()=>{document.getElementById('pbCloudNewPassword')?.scrollIntoView({behavior:'smooth',block:'center'});
  document.getElementById('pbCloudNewPassword')?.focus({preventScroll:true});
  document.getElementById('pbCloudPasswordStatus').textContent='Choose a new password to complete your reset.';},130);};guide();
});
update(window.PawboundCloudIdentity||{});
})();
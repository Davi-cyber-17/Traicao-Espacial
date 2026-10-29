/* AMONG US – HTML/CSS/JS puros. Online por salas via PeerJS (WebRTC, sem servidor próprio).
   O anfitrião da sala roda a partida; os demais enviam comandos e recebem o estado. */
const $=i=>document.getElementById(i),cv=$('cv'),cx=cv.getContext('2d');
const COL=['#c51111','#132ed1','#117f2d','#ed54ba','#ef7d0d','#f5f557','#3f474e','#d6e0f0','#6b2fbb','#71491e','#38fedc','#50ef39'];
const NM=['Vermelho','Azul','Verde','Rosa','Laranja','Amarelo','Preto','Branco','Roxo','Marrom','Ciano','Lima'];
const RM0=[[600,100,400,260,'Refeitório'],[1250,150,300,260,'Navegação'],[100,100,300,260,'Motores'],[100,640,300,260,'Elétrica'],[600,640,400,260,'Reator'],[1250,640,300,260,'Enfermaria'],[1750,100,300,260,'Oxigênio'],[1750,640,300,260,'Escudos'],[100,1180,300,260,'Depósito'],[600,1180,400,260,'Comunicações'],[1250,1180,300,260,'Segurança'],[1750,1180,300,260,'Laboratório']];
/* Corredores com 80px de largura e 30px de sobreposição com as salas (sem "zonas mortas" nas portas) */
const CR0=[[370,190,260,80],[970,190,310,80],[1370,380,80,290],[970,730,310,80],[770,330,80,340],[210,330,80,340],[370,730,260,80],[1520,190,260,80],[1520,730,260,80],[1860,330,80,340],[210,870,80,340],[770,870,80,340],[1370,870,80,340],[1860,870,80,340],[370,1270,260,80],[970,1270,310,80],[1520,1270,260,80]];
/* Mapa ampliado: tudo que é geometria/lógica usa coordenadas do mundo (projeto x K); o jogador, a visão e as distâncias de interação continuam do mesmo tamanho */
const K=1.5,SC=r=>r.map(v=>typeof v=='number'?v*K:v),FL0=RM0.concat(CR0),RM=RM0.map(SC),CR=CR0.map(SC),FL=RM.concat(CR);
const ST0=[[160,160],[340,300],[1300,200],[1500,360],[160,700],[350,850],[650,700],[950,850],[1300,700],[1500,850],[650,160],[950,300],[250,500],[1410,520],[1800,160],[2000,300],[1800,700],[2000,850],[160,1240],[350,1390],[650,1240],[950,1390],[1300,1240],[1500,1390],[1800,1240],[2000,1390]];
const ST=ST0.map(SC);
/* Sabotagens: cada uma tem um ponto de conserto na sala correspondente (Elétrica, Oxigênio, Escudos) */
const SB0={luz:[340,740],o2:[1990,160],esc:[1990,780]},SB={luz:SC(SB0.luz),o2:SC(SB0.o2),esc:SC(SB0.esc)},SBK=['luz','o2','esc'],
SBN={luz:['LUZES','Elétrica'],o2:['OXIGÊNIO','Oxigênio'],esc:['ESCUDOS','Escudos']},SAB_T=60,SAB_PCT=.2;
/* Obstáculos circulares [x,y,raio]: mesas, motor, holograma, painel de comando, reator, gerador, scanner */
const CL0=[[800,230,46],[925,150,30],[675,310,30],[250,170,38],[1365,180,30],[1435,180,30],[1400,290,30],[800,770,56],[160,850,34],[1500,740,34],[1900,230,36],[1900,770,40],[250,1310,40],[800,1310,40],[1400,1310,34],[1900,1310,38]];
const CL=CL0.map(SC);
const IN=(x,y)=>FL.some(r=>x>=r[0]&&x<=r[0]+r[2]&&y>=r[1]&&y<=r[1]+r[3]);
/* Colisão pelos "pés" (caixa 22x16): nunca emperra nas emendas sala/corredor */
const ok=(x,y)=>{const fy=y+14;for(const[a,b]of[[-11,-8],[11,-8],[-11,8],[11,8],[0,-8],[0,8],[-11,0],[11,0]])if(!IN(x+a,fy+b))return 0;return!CL.some(c=>Math.hypot(x-c[0],fy-c[1])<c[2]+9)};
function step(o,dx,dy,dt){const l=Math.hypot(dx,dy);if(!l)return 0;let s=225*dt;while(s>0){const st=Math.min(s,4);s-=st;const sx=dx/l*st,sy=dy/l*st;if(ok(o.x+sx,o.y))o.x+=sx;if(ok(o.x,o.y+sy))o.y+=sy}return 1}
const D=(a,b,c,d)=>Math.hypot(a-c,b-d),esc=s=>String(s).replace(/[<>&"]/g,'');
CanvasRenderingContext2D.prototype.roundRect||(CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h){this.rect(x,y,w,h)});
const TU={username:'openrelayproject',credential:'openrelayproject'};
const PC={config:{iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'},{urls:'turn:openrelay.metered.ca:80',...TU},{urls:'turn:openrelay.metered.ca:443',...TU},{urls:'turn:openrelay.metered.ca:443?transport=tcp',...TU}]}};
let myName='',isHost=0,pr,conn,conns={},lobby=[],code='',up=null,H=null;

/* ---------- Menus ---------- */
function show(id){document.querySelectorAll('.scr').forEach(e=>e.classList.add('hide'));if(id!='game')$(id).classList.remove('hide');$('hud').classList.toggle('hide',id!='game')}
const nm=()=>$('nome').value.trim()||'Jogador';
$('bOn').onclick=()=>{myName=nm();show('online')};
$('bLo').onclick=()=>{myName=nm();show('local')};
document.querySelectorAll('.v').forEach(b=>b.onclick=()=>show('menu'));
$('nj').oninput=()=>$('njv').textContent=$('nj').value;
$('bIni').onclick=()=>{const n=+$('nj').value,l=[{id:'H',n:myName}];for(let i=1;i<n;i++)l.push({id:'b'+i,n:NM[i],bot:1});isHost=1;up=m=>hm('H',m);startGame(l)};
$('bCria').onclick=()=>{code=Math.random().toString(36).slice(2,6).toUpperCase();if(pr)pr.destroy();pr=new Peer('amongus-'+code,PC);
 pr.on('open',()=>{lobby=[{id:'H',n:myName}];isHost=1;up=m=>hm('H',m);bl()});
 pr.on('error',e=>e.type=='unavailable-id'?$('bCria').click():$('msg').textContent='Erro de conexão');
 pr.on('connection',c=>{c.on('data',m=>{if(m.t=='join'){if(H||lobby.length>=12){c.send({t:'err',x:'Sala cheia ou partida em andamento'});return}
  conns[c.peer]=c;lobby.push({id:c.peer,n:esc(m.n).slice(0,10)});bl()}else hm(c.peer,m)});
  c.on('close',()=>{delete conns[c.peer];if(H){const p=H.P.find(q=>q.id==c.peer);if(p)p.bot=1}else{lobby=lobby.filter(l=>l.id!=c.peer);bl()}})})};
$('bEnt').onclick=()=>{const c=$('cod').value.trim().toUpperCase();if(c.length<4)return;$('msg').textContent='Conectando...';pr=new Peer(PC);
 pr.on('error',()=>$('msg').textContent='Sala não encontrada');
 pr.on('open',()=>{conn=pr.connect('amongus-'+c,{reliable:true});
  conn.on('open',()=>{up=m=>conn.send(m);up({t:'join',n:myName})});
  conn.on('data',onMsg);conn.on('close',()=>{alert('Conexão perdida');location.reload()})})};
$('bBot').onclick=()=>{if(lobby.length<12){lobby.push({id:'b'+Math.random(),n:NM[lobby.length],bot:1});bl()}};
$('bGo').onclick=()=>lobby.length>=3&&startGame(lobby,nImp);
/* anfitrião escolhe os impostores: de 1 até o máximo em que os tripulantes ainda são maioria */
let nImp=1;const mxI=()=>Math.max(1,(lobby.length-1)>>1);
function rI(){nImp=Math.min(Math.max(1,nImp),mxI());$('imn').textContent=nImp;$('imm').disabled=nImp<=1;$('imp').disabled=nImp>=mxI()}
$('imm').onclick=()=>{nImp--;rI()};$('imp').onclick=()=>{nImp++;rI()};
function bl(){rI();lobby.forEach(l=>tx(l.id,{t:'lobby',L:lobby.map(x=>x.n),code,host:l.id=='H'}))}
function tx(id,m){id=='H'?onMsg(m):(conns[id]&&conns[id].open&&conns[id].send(m))}

/* ---------- Anfitrião: lógica da partida ---------- */
function startGame(list,k){
 const n=list.length,imp=k?Math.max(1,Math.min(k,(n-1)>>1)):n>=7?2:1,ids=[...Array(n).keys()].sort(()=>Math.random()-.5).slice(0,imp),pool=[...ST.keys()];
 const P=list.map((p,i)=>({id:p.id,n:p.n,c:i,bot:!!p.bot,a:1,r:ids.includes(i)?'i':'c',dx:0,dy:0,f:1,k:20,em:1,v:null,tk:[],bt:5+Math.random()*10}));
 P.forEach(p=>{if(p.r=='c')p.tk=pool.sort(()=>Math.random()-.5).slice(0,3).map(i=>({i,d:0}))});
 H={ph:'play',P,B:[],lt:0,sb:0,sab:null,pr:0,m:null,e:null,n:0};spawn();setInterval(tick,33)}
function spawn(){H.P.forEach((p,i)=>{p.x=800*K+Math.cos(i*6.283/H.P.length)*95*K;p.y=230*K+Math.sin(i*6.283/H.P.length)*75*K;p.dx=p.dy=0})}
let TK=performance.now();function tick(){const g=H,now=performance.now(),dt=Math.min(.1,(now-TK)/1000);TK=now;
 if(g.ph=='play'){g.sb=Math.max(0,g.sb-dt);if(g.sab&&(g.sab.t-=dt)<=0){g.sab=null;fim('i')}
  g.P.forEach(p=>{if(p.bot)bot(p,dt);p.k=Math.max(0,p.k-dt);const l=Math.hypot(p.dx,p.dy);
   if(l>0&&g.ph=='play'){step(p,p.dx,p.dy,dt);if(p.dx)p.f=p.dx>0?1:-1}})}
 else if(g.ph=='meet'){const m=g.m;m.t-=dt;if(m.t<=0&&!m.res)tally();
  g.P.forEach(p=>{if(p.bot&&p.a&&p.v===null&&!m.res&&Math.random()<.015){
   const al=g.P.filter(q=>q.a&&q.c!=p.c&&!(p.r=='i'&&q.r=='i'));hm(p.id,{t:'vote',v:Math.random()<.4||!al.length?-1:al[Math.random()*al.length|0].c})}});
  if(m.res&&(m.rt-=dt)<=0)resume()}
 if(++g.n%2==0)g.P.forEach(p=>{if(!p.bot)tx(p.id,snap(p))})}
function bot(p,dt){if(!p.a||H.ph!='play'){p.dx=p.dy=0;return}
 if(p.mt===undefined||(p.mt-=dt)<=0||Math.abs(p.x-p.lx)+Math.abs(p.y-p.ly)<1){const a=Math.random()*6.283;p.dx=Math.cos(a);p.dy=Math.sin(a);p.mt=1+Math.random()*2}
 p.lx=p.x;p.ly=p.y;
 if(H.B.some(b=>D(p.x,p.y,b.x,b.y)<130)&&Math.random()<(p.r=='i'?.004:.03)){hm(p.id,{t:'report'});return}
 if(p.r=='c'){if(H.sab&&(p.bf-=dt)<=0)fx(p);if((p.bt-=dt)<=0){const t=p.tk.find(t=>!t.d);if(t){t.d=1;chk()}p.bt=15+Math.random()*15}}
 else{if(p.k<=0&&Math.random()<.03)hm(p.id,{t:'kill'});if(!H.sab&&!H.sb&&Math.random()<.0008)hm(p.id,{t:'sab',k:SBK[Math.random()*3|0]})}}
function snap(p){const g=H;return{ph:g.ph,P:g.P.map(q=>[q.c,q.n,q.x|0,q.y|0,q.a,q.f,p.r=='i'&&q.r=='i'?1:0,q.v!==null?1:0]),B:g.B.map(b=>[b.x|0,b.y|0,b.c]),
 pr:g.pr,lt:!!(g.sab&&g.sab.k=='luz'),sab:g.sab&&{k:g.sab.k,t:Math.ceil(g.sab.t),need:g.sab.need,n:g.sab.fx.length,done:g.sab.fx.includes(p.c)},me:p.c,r:p.r,k:p.k|0,em:p.em,tk:p.tk,sb:g.sb>0,v:p.v,e:g.e,m:g.m&&{t:g.m.t|0,ch:g.m.ch,res:g.m.res,by:g.m.by,rt:Math.ceil(g.m.rt)}}}
function hm(id,m){const g=H,p=g&&g.P.find(q=>q.id==id);if(!p)return;const pl=g.ph=='play';
 if(m.t=='in'){p.dx=+m.dx||0;p.dy=+m.dy||0}
 else if(m.t=='task'&&pl){const k=p.tk.find(k=>k.i==m.i&&!k.d);if(k&&D(p.x,p.y,ST[k.i][0],ST[k.i][1])<100){k.d=1;chk()}}
 else if(m.t=='kill'&&pl&&p.r=='i'&&p.a&&p.k<=0){const v=g.P.filter(q=>q.a&&q.r=='c'&&D(p.x,p.y,q.x,q.y)<85).sort((a,b)=>D(p.x,p.y,a.x,a.y)-D(p.x,p.y,b.x,b.y))[0];
  if(v){v.a=0;g.B.push({x:v.x,y:v.y,c:v.c});p.x=v.x;p.y=v.y;p.k=20;chk()}}
 else if(m.t=='report'&&pl&&p.a&&g.B.some(b=>D(p.x,p.y,b.x,b.y)<110))meet(p);
 else if(m.t=='emerg'&&pl&&p.a&&p.em&&D(p.x,p.y,800*K,230*K)<100){p.em=0;meet(p)}
 else if(m.t=='sab'&&pl&&p.r=='i'&&p.a&&!g.sb&&!g.sab&&SBK.includes(m.k))startSab(m.k)
 else if(m.t=='fix'&&pl&&p.a&&p.r=='c'&&g.sab&&D(p.x,p.y,SB[g.sab.k][0],SB[g.sab.k][1])<100)fx(p)
 else if(m.t=='vote'&&g.ph=='meet'&&p.a&&p.v===null&&!g.m.res&&(m.v==-1||g.P.some(q=>q.c==m.v&&q.a))){p.v=m.v;if(g.P.filter(q=>q.a).every(q=>q.v!==null))tally()}
 else if(m.t=='chat'&&g.ph=='meet'&&p.a){g.m.ch.push([p.c,p.n+': '+String(m.x).slice(0,60)]);g.m.ch=g.m.ch.slice(-8)}}
/* Sabotagem: 1 minuto; só ~20% dos jogadores (mín. 1) precisam ir ao ponto de conserto e completar o reparo */
function startSab(k){const g=H,al=g.P.filter(q=>q.a),cr=al.filter(q=>q.r=='c').length;
 g.sab={k,t:SAB_T,need:Math.min(Math.max(cr,1),Math.max(1,Math.round(al.length*SAB_PCT))),fx:[]};
 g.P.forEach(q=>{if(q.bot&&q.r=='c')q.bf=20+Math.random()*50})}
function fx(p){const s=H.sab;if(!s||s.fx.includes(p.c))return;s.fx.push(p.c);if(s.fx.length>=s.need){H.sab=null;H.sb=30}}
function meet(p){H.ph='meet';H.lt=0;H.P.forEach(q=>{q.v=null;q.dx=q.dy=0});H.m={t:45,ch:[],res:null,rt:6,by:p.c}}
function tally(){const g=H,c={};g.P.forEach(p=>{if(p.a){const k=p.v===null?-1:p.v;c[k]=(c[k]||0)+1}});
 let b=-1,n=0,tie=0;for(const k in c){if(c[k]>n){n=c[k];b=+k;tie=0}else if(c[k]==n)tie=1}
 let r='Ninguém foi ejetado.';
 if(b>=0&&!tie){const v=g.P.find(q=>q.c==b);v.a=0;r=v.n+(v.r=='i'?' ERA':' NÃO ERA')+' o Impostor.'}
 g.m.res=r;g.m.rt=4}
function resume(){H.ph='play';H.B=[];H.m=null;H.P.forEach(p=>p.k=Math.max(p.k,10));spawn();chk()}
function chk(){const g=H;let t=0,d=0;g.P.forEach(p=>p.tk.forEach(k=>{t++;d+=k.d}));g.pr=t?d/t:0;
 const im=g.P.filter(p=>p.r=='i'&&p.a).length,cr=g.P.filter(p=>p.r=='c'&&p.a).length;
 if(g.pr>=1||!im)fim('c');else if(im>=cr)fim('i')}
function fim(w){H.ph='end';H.e=w}

/* ---------- Cliente: UI e entrada ---------- */
let S=null,pp={},roleShown=0,gameOn=0,lastK='',wasM=0;
function onMsg(m){
 if(m.t=='lobby'){$('lc').textContent=m.code;$('ll').innerHTML=m.L.map(n=>`<div>${esc(n)}</div>`).join('');
  $('bGo').classList.toggle('hide',!m.host);$('bBot').classList.toggle('hide',!m.host);$('imw').classList.toggle('hide',!m.host);$('bGo').disabled=m.L.length<3;$('lw').classList.toggle('hide',!!m.host);show('lobby');return}
 if(m.t=='err'){$('msg').textContent=m.x;return}
 S=m;ui()}
function useT(me){if(S.sab&&S.r!='i'&&me[4]&&!S.sab.done&&D(me[2],me[3],SB[S.sab.k][0],SB[S.sab.k][1])<80)return 'F';
 for(const k of S.tk)if(!k.d&&D(me[2],me[3],ST[k.i][0],ST[k.i][1])<80)return k.i;
 return S.em&&me[4]&&D(me[2],me[3],800*K,230*K)<90?'E':null}
function sabUI(pl,al){const b=$('sabbar'),s=S.sab;if(!s||!pl){b.classList.add('hide');return}
 b.classList.remove('hide');const n=SBN[s.k],imp=S.r=='i';
 const h='⚠ SABOTAGEM: '+n[0]+' · <b>'+s.t+'s</b><br><small>'+(imp?'Impeça o conserto!':s.done?'Você já consertou. Aguarde os outros.':'Vá até '+n[1]+' e conserte')+' · '+s.n+'/'+s.need+'</small>';if(b._h!=h){b._h=h;b.innerHTML=h}
 if(s.t<=10)b.classList.add('urg');else b.classList.remove('urg');
 if(imp||s.done||!al)b.classList.add('calm');else b.classList.remove('calm');$('sabm').classList.add('hide')}
function ui(){const me=S.P.find(q=>q[0]==S.me),imp=S.r=='i',al=!!me[4],pl=S.ph=='play';
 if(!gameOn){gameOn=1;show('game')}
 $('bar').style.width=S.pr*100+'%';
 $('bKill').classList.toggle('hide',!imp);$('bSab').classList.toggle('hide',!imp);
 $('bKill').textContent=S.k>0?'MATAR '+S.k:'MATAR';$('bKill').classList.toggle('off',S.k>0||!al);$('bSab').classList.toggle('off',S.sb||!al||!!S.sab);
 sabUI(pl,al);
 $('bRep').classList.toggle('off',!(al&&pl&&S.B.some(b=>D(me[2],me[3],b[0],b[1])<110)));
 $('bUse').classList.toggle('off',!pl||useT(me)===null);
 if(pl&&!roleShown){roleShown=1;$('rt').textContent=imp?'IMPOSTOR':'TRIPULANTE';$('rt').style.color=imp?'#e22':'#6cf';
  $('rp').textContent=imp?'Elimine os tripulantes. Aliados: '+(S.P.filter(q=>q[6]&&q[0]!=S.me).map(q=>q[1]).join(', ')||'nenhum'):'Complete as tarefas e descubra o impostor.';
  $('role').classList.remove('hide');setTimeout(()=>$('role').classList.add('hide'),3500)}
 /* entrada/saída da reunião: limpa tudo que pode ter ficado preso na tela ou nos controles */
 if(S.ph=='meet'&&!wasM){wasM=1;$('sabm').classList.add('hide');J=J0=null;for(const k in KB)delete KB[k];lx=ly=0;closeTask()}
 else if(S.ph!='meet'&&wasM){wasM=0;pp={};lastK='';$('meet').classList.add('hide');$('ci').blur();$('ci').value='';J=J0=null;for(const k in KB)delete KB[k];lx=-9;sd()}
 meetUI();
 if(S.ph=='end'){$('meet').classList.add('hide');$('end').classList.remove('hide');const w=(S.e=='i')==imp;
  $('et').innerHTML=(w?'VITÓRIA':'DERROTA')+'<br><small>'+(S.e=='i'?'Os impostores venceram':'Os tripulantes venceram')+'</small>'}}
function meetUI(){const on=S.ph=='meet';$('meet').classList.toggle('hide',!on);if(!on){lastK='';return}
 const m=S.m,me=S.P.find(q=>q[0]==S.me),by=S.P.find(q=>q[0]==m.by);
 $('mh').textContent=by[1]+' chamou uma reunião';$('mt').textContent=m.res?m.res+' · voltando ao jogo em '+m.rt+'s':'Votação: '+m.t+'s';
 const k=JSON.stringify([m.ch.length,m.res,S.P.map(q=>q[4]+''+q[7]),S.v]);if(k==lastK)return;lastK=k;
 const can=()=>me[4]&&S.v===null&&!m.res;$('cards').innerHTML='';
 S.P.forEach(q=>{const d=document.createElement('div');d.className='card'+(q[4]?'':' dead')+(q[0]==S.me?' me':'');
  d.innerHTML=`<i class="dot" style="background:${COL[q[0]]}"></i>${esc(q[1])}${q[7]?' ✔':''}${S.v===q[0]?' 👈':''}`;
  d.onclick=()=>can()&&up({t:'vote',v:q[0]});$('cards').append(d)});
 $('skip').onclick=()=>can()&&up({t:'vote',v:-1});
 $('chat').innerHTML=m.ch.map(c=>`<div style="color:${COL[c[0]]}">${esc(c[1])}</div>`).join('');$('chat').scrollTop=1e5}
$('ci').onkeydown=e=>{if(e.key=='Enter'&&e.target.value.trim()){up({t:'chat',x:e.target.value});e.target.value=''}};
function useA(){if(!S||S.ph!='play'||isT())return;const t=useT(S.P.find(q=>q[0]==S.me));if(t=='E')up({t:'emerg'});else if(t!==null)openTask(t)}
$('bUse').onclick=useA;$('bKill').onclick=()=>up&&up({t:'kill'});$('bRep').onclick=()=>up&&up({t:'report'});$('bSab').onclick=()=>{if(S&&S.r=='i'&&S.ph=='play'&&!S.sab&&!S.sb&&S.P.find(q=>q[0]==S.me)[4])$('sabm').classList.remove('hide')};
$('sabm').onclick=e=>{const k=e.target.dataset&&e.target.dataset.k;if(k)up({t:'sab',k});if(k||e.target.id=='sabx')$('sabm').classList.add('hide')};
/* ---------- Tarefas: um minijogo diferente para cada área ---------- */
const TY={Motores:'hold',Navegação:'stars',Elétrica:'wires',Reator:'zone',Enfermaria:'code',Refeitório:'order',Oxigênio:'dots',Escudos:'slide',Depósito:'mash',Comunicações:'tune',Segurança:'simon',Laboratório:'mix'};
const TT=ST.map(s=>{const r=RM.find(r=>s[0]>=r[0]&&s[0]<=r[0]+r[2]&&s[1]>=r[1]&&s[1]<=r[1]+r[3]);return r?TY[r[4]]:'num'});
const TL={hold:['Abastecer o motor','Segure o botão até encher o tanque'],stars:['Traçar a rota','Toque as estrelas em ordem (1 a 5)'],wires:['Ligar os fios','Ligue as cores iguais'],zone:['Estabilizar o reator','Toque quando o marcador estiver na zona verde (3x seguidas)'],code:['Código do paciente','Digite o código mostrado'],order:['Pedido do refeitório','Memorize a ordem e repita'],num:['Reiniciar o circuito','Toque os números em ordem'],dots:['Limpar o filtro de ar','Toque em todas as sujeiras'],slide:['Calibrar os escudos','Leve cada controle até a marca verde'],mash:['Descarregar a carga','Toque 15 vezes em 6 segundos'],tune:['Sintonizar o sinal','Ajuste até o sinal chegar a 100%'],simon:['Câmeras de segurança','Repita a sequência das telas'],mix:['Misturar a fórmula','Toque as cores na ordem da receita']};
let TI=0,TS=0;const isT=()=>!$('task').classList.contains('hide');
function closeTask(){TS++;clearInterval(TI);$('task').classList.add('hide')}
function openTask(i){const ty=i=='F'?'num':TT[i],g=$('tg'),tk=++TS,R=n=>Math.random()*n|0,sh=a=>a.sort(()=>Math.random()-.5),W=()=>tk!=TS,C=['#e33','#36f','#3c4','#fd2'],
 E=(tag,txt,css,par,fn)=>{const e=document.createElement(tag);e.textContent=txt??'';if(css)e.style.cssText=css;(par||g).append(e);if(fn)e.onclick=fn;return e};
 clearInterval(TI);g.innerHTML='';g.style.display='block';g.style.margin='14px auto';J=J0=null;for(const k in KB)delete KB[k];lx=ly=0;
 $('task').querySelector('p').innerHTML='<b>'+TL[ty][0]+'</b><br><small>'+TL[ty][1]+'</small>';$('task').classList.remove('hide');if(i=='F')$('task').querySelector('p').innerHTML='<b>Consertar: '+SBN[S.sab.k][0]+'</b><br><small>Toque os números em ordem</small>';
 const done=()=>{if(W())return;TS++;clearInterval(TI);setTimeout(()=>{up(i=='F'?{t:'fix'}:{t:'task',i});$('task').classList.add('hide')},300)};
 if(ty=='num'){g.style.display='grid';g.style.margin='14px';let n=1;sh([1,2,3,4,5,6]).forEach(v=>{const b=E('button',v,'',g,()=>{if(v==n){b.classList.add('ok');if(++n>6)done()}else{n=1;g.querySelectorAll('.ok').forEach(x=>x.classList.remove('ok'))}})})}
 else if(ty=='hold'){let v=0,dn=0;const bar=E('div','','width:min(280px,80vw);height:22px;border:2px solid #0ff;margin:10px auto;position:relative'),f=E('i','','position:absolute;left:0;top:0;bottom:0;width:0;background:linear-gradient(90deg,#fa0,#fd4)',bar),b=E('button','SEGURAR','padding:22px 30px');b.onpointerdown=()=>dn=1;b.onpointerup=b.onpointerleave=b.onpointercancel=()=>dn=0;
  TI=setInterval(()=>{v=Math.max(0,Math.min(100,v+(dn?2.2:-1.2)));f.style.width=v+'%';if(v>=100)done()},50)}
 else if(ty=='zone'){let x=0,d=1,n=0,zs=20+R(45);const bar=E('div','','width:min(280px,80vw);height:26px;border:2px solid #0ff;margin:10px auto;position:relative;background:#050c1c'),zn=E('i','','position:absolute;top:0;bottom:0;width:20%;background:#2d6;left:'+zs+'%',bar),mk=E('i','','position:absolute;top:-4px;bottom:-4px;width:5px;background:#fff;box-shadow:0 0 8px #fff',bar),inf=E('div','0/3','margin:6px'),b=E('button','ESTABILIZAR','padding:20px 26px');
  TI=setInterval(()=>{x+=d*2.4;if(x>=100||x<=0)d=-d;x=Math.max(0,Math.min(100,x));mk.style.left=x+'%'},30);
  b.onclick=()=>{if(x>=zs&&x<=zs+20){n++;zs=15+R(60);zn.style.left=zs+'%'}else n=0;inf.textContent=n+'/3';if(n>=3)done()}}
 else if(ty=='wires'){const L=E('div','','display:flex;gap:40px;justify-content:center'),a=E('div','','display:flex;flex-direction:column;gap:10px',L),c=E('div','','display:flex;flex-direction:column;gap:10px',L);let s=-1,n=0;
  C.forEach((k,j)=>E('button','','min-width:0;width:54px;height:36px;border-color:'+k+';background:'+k+'55',a,e=>{s=j;[...a.children].forEach(x=>x.style.outline='');e.currentTarget.style.outline='3px solid #fff'}));
  sh([0,1,2,3]).forEach(j=>{const b=E('button','','min-width:0;width:54px;height:36px;border-color:'+C[j]+';background:'+C[j]+'55',c,()=>{if(s<0||b.dataset.d)return;if(s==j){b.dataset.d=1;b.style.background=C[j];a.children[j].style.background=C[j];a.children[j].style.outline='';s=-1;if(++n>=4)done()}else{s=-1;[...a.children].forEach(x=>x.style.outline='')}})})}
 else if(ty=='tune'){const t0=15+R(70),r=E('input','','width:min(280px,80vw)'),o=E('div','Sinal: 0%','margin:10px;font-size:20px');r.type='range';r.min=0;r.max=100;r.value=R(100);
  const u=()=>{const d=Math.abs(r.value-t0),p=d<=2?100:Math.max(0,100-d*4);o.textContent='Sinal: '+p+'%';o.style.color=p>=100?'#6f6':'#dff';return p};u();r.oninput=u;r.onchange=()=>{if(u()>=100)done()}}
 else if(ty=='simon'){const sq=[R(4),R(4),R(4),R(4)];let k=0,go=0;const gr=E('div','','display:grid;grid-template-columns:repeat(2,90px);gap:10px;justify-content:center'),
  fl=j=>{B[j].style.background=C[j];setTimeout(()=>B[j].style.background=C[j]+'44',250)},
  play=()=>{go=0;k=0;sq.forEach((j,n)=>setTimeout(()=>!W()&&fl(j),600+n*600));setTimeout(()=>go=1,600+4*600)},
  B=C.map((c,j)=>E('button','','min-width:0;height:70px;background:'+c+'44;border-color:'+c,gr,()=>{if(!go||W())return;fl(j);if(j==sq[k]){if(++k>=4)done()}else{go=0;setTimeout(play,500)}}));play()}
 else if(ty=='mash'){let n=0,t0=0;const o=E('div','0/15','font-size:22px;margin:8px');E('button','DESCARREGAR','padding:24px 28px',g,()=>{const now=Date.now();if(now-t0>6000){t0=now;n=0}n++;o.textContent=n+'/15';if(n>=15)done()})}
 else if(ty=='dots'){let n=6;const f=E('div','','position:relative;width:min(280px,80vw);height:170px;border:2px solid #0ff;margin:8px auto;background:#07162a;overflow:hidden');for(let j=0;j<6;j++){const d=E('b','','position:absolute;width:34px;height:34px;border-radius:50%;background:#7a5a2a;border:2px solid #c9a35c;left:'+(R(78)+2)+'%;top:'+R(70)+'%',f,()=>{d.remove();if(--n<=0)done()})}}
 else if(ty=='slide'){const T=[0,1,2].map(()=>10+R(80)),S2=[];T.forEach((t0,j)=>{const w=E('div','','position:relative;margin:14px auto;width:min(280px,80vw)');E('i','','position:absolute;top:-4px;width:8px;height:24px;background:#2d6;margin-left:-4px;left:'+t0+'%',w);const r=E('input','','width:100%',w);r.type='range';r.min=0;r.max=100;r.value=R(100);S2.push(r);
  r.oninput=()=>{r.style.accentColor=Math.abs(r.value-t0)<=4?'#6f6':'#0ff';if(S2.every((q,n)=>Math.abs(q.value-T[n])<=4))done()}})}
 else if(ty=='code'){const c=''+(100+R(900)),s=E('div','','font-size:26px;height:34px;margin:4px;letter-spacing:.3em');E('div','Código: '+c,'font-size:26px;letter-spacing:.3em;margin:6px;color:#fc3');const k=E('div','','display:grid;grid-template-columns:repeat(3,64px);gap:8px;justify-content:center');let v='';
  [1,2,3,4,5,6,7,8,9,'C',0].forEach(d=>E('button',d,'min-width:0;padding:14px 0',k,()=>{if(d=='C')v='';else v+=d;s.textContent=v;if(v.length>=3){if(v==c)done();else{v='';setTimeout(()=>s.textContent='',200)}}}))}
 else if(ty=='order'){const F=['🍕','🍔','🍟','🥤','🍩','🍎'],q=sh(F.slice()).slice(0,4),o=E('div',q.join(' '),'font-size:34px;margin:8px;height:46px'),k=E('div','','display:grid;grid-template-columns:repeat(3,64px);gap:8px;justify-content:center'),hide=ms=>setTimeout(()=>{if(!W()){o.textContent='❓ ❓ ❓ ❓';hid=1}},ms);let n=0,hid=0;hide(2800);
  F.forEach(f=>E('button',f,'min-width:0;font-size:26px;padding:10px 0',k,()=>{if(!hid||W())return;if(f==q[n]){o.textContent=q.slice(0,++n).join(' ')+' ❓'.repeat(4-n);if(n>=4)done()}else{n=0;hid=0;o.textContent=q.join(' ');hide(1800)}}))}
 else if(ty=='stars'){let n=1;const f=E('div','','position:relative;width:min(280px,80vw);height:190px;border:2px solid #0ff;margin:8px auto;background:radial-gradient(#10264a,#050c1c)');sh([1,2,3,4,5]).forEach(v=>{const b=E('button',v,'min-width:0;position:absolute;width:42px;height:42px;padding:0;left:'+(R(78)+1)+'%;top:'+(R(70)+2)+'%',f,()=>{if(v==n){b.style.background='#063';if(++n>5)done()}else{n=1;f.querySelectorAll('button').forEach(x=>x.style.background='')}})})}
 else if(ty=='mix'){const q=[R(4),R(4),R(4),R(4)];let n=0;E('div','Receita:','margin:4px');const o=E('div','','display:flex;gap:8px;justify-content:center;margin-bottom:10px');q.forEach(j=>E('i','','width:26px;height:26px;border-radius:50%;background:'+C[j]+';border:2px solid #fff;opacity:.45',o));const k=E('div','','display:flex;gap:10px;justify-content:center');
  C.forEach((c,j)=>E('button','','min-width:0;width:56px;height:56px;background:'+c+';border-color:#fff',k,()=>{if(j==q[n]){o.children[n].style.opacity=1;if(++n>=4)done()}else{n=0;[...o.children].forEach(x=>x.style.opacity=.45)}}))}}
$('tx').onclick=closeTask;

/* Controles: teclado (WASD/setas, E usar, Q matar, R reportar) e joystick por toque */
const KB={};let J=null,J0=null,lx=0,ly=0;
let sT=0,sP=0;
function sd(){if(!up)return;let dx=(KB.d||KB.arrowright?1:0)-(KB.a||KB.arrowleft?1:0),dy=(KB.s||KB.arrowdown?1:0)-(KB.w||KB.arrowup?1:0);
 if(J){dx=J.x;dy=J.y}if(isT())dx=dy=0;dx=Math.round(dx*12)/12;dy=Math.round(dy*12)/12;
 if(dx!=lx||dy!=ly){const n=performance.now();if(!(dx||dy)||lx==-9||n-sT>=40){sT=n;lx=dx;ly=dy;up({t:'in',dx,dy})}else if(!sP)sP=setTimeout(()=>{sP=0;sd()},40-(n-sT))}}
onkeydown=e=>{if(e.target.tagName=='INPUT')return;const k=e.key.toLowerCase();KB[k]=1;
 if(k=='e'||k==' ')useA();if(k=='q')$('bKill').click();if(k=='r')$('bRep').click();sd()};
onkeyup=e=>{delete KB[e.key.toLowerCase()];sd()};
cv.onpointerdown=e=>{J0={x:e.clientX,y:e.clientY};J={x:0,y:0};cv.setPointerCapture(e.pointerId)};
cv.onpointermove=e=>{if(!J0)return;const dx=e.clientX-J0.x,dy=e.clientY-J0.y,l=Math.hypot(dx,dy);J=l>12?{x:dx/Math.max(l,40),y:dy/Math.max(l,40)}:{x:0,y:0};sd()};
cv.onpointerup=cv.onpointercancel=()=>{J=J0=null;sd()};
setInterval(()=>{if(S){lx=-9;sd()}},200);

/* ---------- Mapa pré-renderizado (1 vez) + camada animada ---------- */
/* Desempenho: escala de render adaptativa (baixa sozinha se o FPS cair), região visível e cache de vinhetas */
let RS=1,fA=0,fN=0,fG=0,VR=[0,0,1e9,1e9];const vs=(x,y,r)=>x+r>VR[0]&&x-r<VR[2]&&y+r>VR[1]&&y-r<VR[3],VC={};
function adapt(rw){if(rw<=0||rw>.5)return;fA+=rw;if(++fN<40)return;const a=fA/fN;fA=fN=0;
 if(a>.024&&RS>.6){RS=Math.max(.6,RS*.85);fG=0}else if(a<.0185){if(++fG>=4&&RS<1){RS=Math.min(1,RS*1.15);fG=0}}else fG=0}
function vig(key,W,Hh,r0,r1,c0,c1,a){let c=VC[key];if(!c){const k=4,o=document.createElement('canvas');o.width=Math.ceil(W/k);o.height=Math.ceil(Hh/k);const g=o.getContext('2d'),q=g.createRadialGradient(o.width/2,o.height/2,r0/k,o.width/2,o.height/2,r1/k);q.addColorStop(0,c0);q.addColorStop(1,c1);g.fillStyle=q;g.fillRect(0,0,o.width,o.height);
  if(Object.keys(VC).length>6)for(const x in VC)delete VC[x];c=VC[key]=o}
 cx.globalAlpha=a;cx.drawImage(c,0,0,W,Hh);cx.globalAlpha=1}
const MX=60,MY=60,MW=2040,MH=1440,LED=[],PT=[];let MP=null,DS=null,lastB=0;
const TINT=[['#1d2f4d','#213760'],['#14304a','#183a58'],['#2b2b47','#323352'],['#2f2a35','#3a323f'],['#173243','#1c3b50'],['#1b3a3f','#214349'],['#173a28','#1d4632'],['#16254f','#1b2f63'],['#3a2f22','#443728'],['#2c2347','#352a55'],['#3a2326','#452a2e'],['#163a3a','#1b4646']];
const LB=[[800,128],[1315,392],[155,345],[275,884],[800,884],[1400,884],[1900,128],[1840,884],[175,1424],[800,1424],[1400,1424],[1900,1424]];
const DR=[[400,230,0],[600,230,0],[1000,230,0],[1250,230,0],[1410,410,1],[1410,640,1],[1000,770,0],[1250,770,0],[810,360,1],[810,640,1],[250,360,1],[250,640,1],[400,770,0],[600,770,0],[1550,230,0],[1750,230,0],[1550,770,0],[1750,770,0],[1900,360,1],[1900,640,1],[250,900,1],[250,1180,1],[810,900,1],[810,1180,1],[1410,900,1],[1410,1180,1],[1900,900,1],[1900,1180,1],[400,1310,0],[600,1310,0],[1000,1310,0],[1250,1310,0],[1550,1310,0],[1750,1310,0]];
const dop=DR.map(()=>0),STR=Array.from({length:90},(_,i)=>[(i*97%100)/100,(i*53%100)/100,.6+i%4*.5,i]);
function bake(){const RM=RM0,CR=CR0,FL=FL0,MS=(devicePixelRatio||1)>=2?1.6:1.3,c=document.createElement('canvas');c.width=MW*MS;c.height=MH*MS;const g=c.getContext('2d');g.scale(MS,MS);g.translate(-MX,-MY);
 g.shadowColor='#00e5ff';g.shadowBlur=24;g.fillStyle='#1a2a46';FL.forEach(r=>g.fillRect(r[0]-16,r[1]-16,r[2]+32,r[3]+32));g.shadowBlur=0;
 g.fillStyle='#243b60';FL.forEach(r=>g.fillRect(r[0]-12,r[1]-12,r[2]+24,r[3]+24));
 g.strokeStyle='rgba(79,208,255,.5)';g.lineWidth=1.5;FL.forEach(r=>g.strokeRect(r[0]-12,r[1]-12,r[2]+24,r[3]+24));
 const tile=(r,a,b)=>{g.fillStyle=a;g.fillRect(r[0],r[1],r[2],r[3]);g.fillStyle=b;for(let x=0;x<r[2];x+=40)for(let y=0;y<r[3];y+=40)if((x+y)/40%2==0)g.fillRect(r[0]+x,r[1]+y,Math.min(40,r[2]-x),Math.min(40,r[3]-y));
  g.strokeStyle='rgba(120,220,255,.07)';g.lineWidth=1;g.beginPath();for(let x=40;x<r[2];x+=40){g.moveTo(r[0]+x,r[1]);g.lineTo(r[0]+x,r[1]+r[3])}for(let y=40;y<r[3];y+=40){g.moveTo(r[0],r[1]+y);g.lineTo(r[0]+r[2],r[1]+y)}g.stroke()};
 const ao=(r,s)=>{const[x,y,w,h]=r,k=24,mk=(a,b,c,d,e,f,i,j)=>{const q=g.createLinearGradient(a,b,c,d);q.addColorStop(0,'rgba(0,0,10,.5)');q.addColorStop(1,'rgba(0,0,10,0)');g.fillStyle=q;g.fillRect(e,f,i,j)};
  if(s&1)mk(0,y,0,y+k,x,y,w,k);if(s&2)mk(0,y+h,0,y+h-k,x,y+h-k,w,k);if(s&4)mk(x,0,x+k,0,x,y,k,h);if(s&8)mk(x+w,0,x+w-k,0,x+w-k,y,k,h)};
 CR.forEach(r=>{tile(r,'#16233a','#1a2a45');ao(r,r[2]>r[3]?3:12)});RM.forEach((r,i)=>{tile(r,TINT[i][0],TINT[i][1]);ao(r,15)});
 g.setLineDash([16,14]);g.strokeStyle='rgba(255,210,70,.3)';g.lineWidth=3;CR.forEach(r=>{g.beginPath();if(r[2]>r[3]){g.moveTo(r[0]+50,r[1]+40);g.lineTo(r[0]+r[2]-50,r[1]+40)}else{g.moveTo(r[0]+40,r[1]+50);g.lineTo(r[0]+40,r[1]+r[3]-50)}g.stroke()});g.setLineDash([]);
 g.fillStyle='rgba(0,229,255,.38)';g.font='bold 20px Orbitron,sans-serif';g.textAlign='center';RM.forEach((r,i)=>g.fillText(r[4],LB[i][0],LB[i][1]));
 /* portas: soleira com listras + batentes */
 DR.forEach(([x,y,h])=>{const rx=h?x-40:x-14,ry=h?y-14:y-40,rw=h?80:28,rh=h?28:80;g.save();g.beginPath();g.rect(rx,ry,rw,rh);g.clip();g.fillStyle='#22344f';g.fillRect(rx,ry,rw,rh);g.strokeStyle='rgba(255,200,40,.5)';g.lineWidth=6;for(let k=-100;k<100;k+=16){g.beginPath();g.moveTo(rx+k,ry);g.lineTo(rx+k+rh,ry+rh);g.stroke()}g.restore();
  [-1,1].forEach(s=>{const px=h?x+s*44:x,py=h?y:y+s*44;g.fillStyle='#355b8f';g.strokeStyle='#7fe3ff';g.lineWidth=2;g.fillRect(px-9,py-9,18,18);g.strokeRect(px-9,py-9,18,18)})});
 /* luz ambiente por sala */
 g.globalCompositeOperation='lighter';RM.forEach((r,i)=>{const cx0=r[0]+r[2]/2,cy0=r[1]+r[3]/2,q=g.createRadialGradient(cx0,cy0,10,cx0,cy0,190);q.addColorStop(0,['rgba(120,170,255,.2)','rgba(80,220,255,.2)','rgba(255,150,70,.16)','rgba(255,220,80,.14)','rgba(60,255,170,.16)','rgba(120,255,230,.16)','rgba(120,255,140,.16)','rgba(90,150,255,.2)','rgba(255,190,90,.14)','rgba(200,120,255,.16)','rgba(255,90,90,.14)','rgba(90,255,200,.16)'][i]);q.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=q;g.fillRect(r[0],r[1],r[2],r[3])});g.globalCompositeOperation='source-over';
 /* canos e painéis nas paredes (LEDs animados depois) */
 RM.forEach((r,i)=>{const wy=r[1]<1000?r[1]-8:r[1]+r[3]+8,nd=x=>DR.some(d=>d[2]&&Math.abs(d[1]-wy)<30&&Math.abs(d[0]-x)<48);g.lineCap='round';for(let x=r[0]+14;x<r[0]+r[2]-14;x+=10)if(!nd(x)&&!nd(x+10)){g.strokeStyle='#4a6591';g.lineWidth=6;g.beginPath();g.moveTo(x,wy);g.lineTo(x+11,wy);g.stroke();g.strokeStyle='rgba(170,215,255,.5)';g.lineWidth=2;g.beginPath();g.moveTo(x,wy-2);g.lineTo(x+11,wy-2);g.stroke()}
  for(let x=r[0]+40;x<r[0]+r[2]-30;x+=60){if(nd(x))continue;g.fillStyle='#14233a';g.fillRect(x-11,wy-5,22,10);g.strokeStyle='#5fd0ff';g.lineWidth=1;g.strokeRect(x-11,wy-5,22,10);LED.push([x-5,wy,['#4f8','#fc4','#f55','#4cf'][(x/60|0)%4],Math.random()])}});
 const sh=(x,y,rx,ry)=>{g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(x+4,y+9,rx,ry,0,0,7);g.fill()},ci=(x,y,r,f,s,w)=>{g.fillStyle=f;g.beginPath();g.arc(x,y,r,0,7);g.fill();if(s){g.strokeStyle=s;g.lineWidth=w||3;g.stroke()}};
 /* Refeitório: tapete, mesas e cadeiras */
 g.fillStyle='rgba(150,60,200,.16)';g.strokeStyle='rgba(220,120,255,.28)';g.lineWidth=3;g.beginPath();g.ellipse(800,232,170,115,0,0,7);g.fill();g.stroke();
 [[800,230,46],[925,150,30],[675,310,30]].forEach(([x,y,r])=>{for(let i=0;i<6;i++){const a=i*1.047+.3;ci(x+Math.cos(a)*(r+11),y+Math.sin(a)*(r+11),7,'#26324d','#0b1424',2)}sh(x,y,r,r*.8);ci(x,y,r,'#3d5379','#7fe3ff');g.strokeStyle='rgba(255,255,255,.2)';g.lineWidth=2;g.beginPath();g.arc(x-3,y-3,r-9,3.4,5);g.stroke()});
 /* Motores: bloco do motor + dutos */
 g.strokeStyle='#5a6f95';g.lineWidth=8;g.beginPath();g.moveTo(250,132);g.lineTo(250,102);g.moveTo(212,170);g.lineTo(106,170);g.moveTo(288,170);g.lineTo(394,170);g.stroke();
 sh(250,170,38,34);ci(250,170,38,'#3a2f3a','#ff9a3c',4);ci(250,170,27,'#1b1420','#6b4a2a',2);for(let i=0;i<8;i++)ci(250+Math.cos(i*.785)*33,170+Math.sin(i*.785)*33,2.5,'#ffb36b');
 /* Elétrica: gerador */
 sh(160,850,42,36);g.fillStyle='#37445f';g.strokeStyle='#ffd84a';g.lineWidth=3;g.beginPath();g.roundRect(118,814,84,72,8);g.fill();g.stroke();g.fillStyle='#ffd84a';g.beginPath();g.moveTo(166,822);g.lineTo(148,856);g.lineTo(160,856);g.lineTo(154,880);g.lineTo(176,842);g.lineTo(164,842);g.closePath();g.fill();
 /* Navegação: painel de comando + holograma */
 sh(1400,180,72,34);g.fillStyle='#22385c';g.strokeStyle='#6fd8ff';g.lineWidth=3;g.beginPath();g.roundRect(1330,150,140,64,[0,0,18,18]);g.fill();g.stroke();[1345,1388,1431].forEach(x=>{g.fillStyle='#07263a';g.fillRect(x,158,32,22);g.strokeStyle='#38d0ff';g.lineWidth=1;g.strokeRect(x,158,32,22);g.strokeStyle='rgba(80,255,255,.6)';g.beginPath();g.moveTo(x+4,172);g.lineTo(x+12,165);g.lineTo(x+20,170);g.lineTo(x+28,162);g.stroke()});
 sh(1400,290,30,26);ci(1400,290,30,'#12304a','#6fd8ff',3);ci(1400,290,18,'#0a1c30','#2a8fb8',2);
 /* Reator: plataforma, anéis de segurança e cabos */
 [[640,680],[960,680],[640,860],[960,860]].forEach(([x,y])=>{g.strokeStyle='#2d7fb0';g.lineWidth=6;g.beginPath();g.moveTo(800,770);g.quadraticCurveTo((800+x)/2,y>770?830:710,x,y);g.stroke();ci(x,y,9,'#173a55','#5fd0ff',2)});
 sh(800,770,62,56);ci(800,770,62,'#10202e','#6df',4);g.setLineDash([10,10]);g.strokeStyle='#ffd84a';g.lineWidth=3;g.beginPath();g.arc(800,770,72,0,7);g.stroke();g.setLineDash([]);
 /* Enfermaria: scanner + macas decorativas */
 sh(1500,740,34,30);ci(1500,740,34,'#1c3b46','#8fe',3);g.fillStyle='#d8f0f5';g.beginPath();g.roundRect(1490,716,20,48,6);g.fill();ci(1500,724,6,'#fff');
 g.fillStyle='#d8f0f5';g.strokeStyle='#8fe';g.lineWidth=2;[[1262,846],[1262,806]].forEach(([x,y])=>{g.beginPath();g.roundRect(x,y,52,30,6);g.fill();g.stroke();g.fillStyle='#7fc8d8';g.fillRect(x+4,y+4,16,22);g.fillStyle='#d8f0f5'});
 g.fillStyle='#e33';g.fillRect(1318,668,10,28);g.fillRect(1309,677,28,10);
 /* Oxigênio: jardim */
 sh(1900,230,38,32);ci(1900,230,36,'#3a2a1e','#7fe38a',3);ci(1900,230,24,'#1f5a2e');[[1815,130],[2000,130],[1815,330],[2000,330]].forEach(([x,y])=>{sh(x,y,16,14);ci(x,y,14,'#2c7a3c','#9dfca8',2);ci(x,y,6,'#7fe38a')});
 /* Escudos: gerador de campo */
 sh(1900,770,44,38);ci(1900,770,42,'#14284a','#5f9bff',4);ci(1900,770,26,'#0b1a33','#3a6fd0',2);
 /* Depósito: caixotes */
 g.fillStyle='#6b4a2a';g.strokeStyle='#d9a85c';g.lineWidth=3;[[231,1291],[271,1291],[231,1331],[271,1331]].forEach(([x,y])=>{g.fillRect(x-19,y-19,38,38);g.strokeRect(x-19,y-19,38,38);g.beginPath();g.moveTo(x-19,y-19);g.lineTo(x+19,y+19);g.moveTo(x+19,y-19);g.lineTo(x-19,y+19);g.stroke()});
 /* Comunicações: antena */
 sh(800,1310,44,38);ci(800,1310,42,'#2a2140','#c88bff',4);ci(800,1310,28,'#140f22','#8a5fd0',2);
 /* Segurança: mesa de monitores */
 sh(1400,1310,40,34);g.fillStyle='#3a2326';g.strokeStyle='#ff6a6a';g.lineWidth=3;g.beginPath();g.roundRect(1360,1284,80,52,10);g.fill();g.stroke();[1368,1402].forEach(x=>{g.fillStyle='#240c0c';g.fillRect(x,1290,28,18);g.strokeStyle='#ff4040';g.lineWidth=1;g.strokeRect(x,1290,28,18)});
 /* Laboratório: cápsula */
 sh(1900,1310,42,36);ci(1900,1310,40,'#123a3a','#6fffe0',4);ci(1900,1310,28,'#0a2424','#2aa88f',2);
 /* detalhes extras: cantoneiras, ventilações, luzes de parede/corredor, prateleiras, barris e plantas */
 RM.forEach(r=>{const[x,y,w,h]=r;g.strokeStyle='rgba(255,210,70,.55)';g.lineWidth=3;g.lineCap='square';[[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]].forEach(([a,b,sx,sy])=>{g.beginPath();g.moveTo(a+sx*26,b+sy*4);g.lineTo(a+sx*4,b+sy*4);g.lineTo(a+sx*4,b+sy*26);g.stroke()});
  const vx=x+w-58,vy=y+h-30;g.fillStyle='#0a1426';g.fillRect(vx,vy,40,18);g.fillStyle='rgba(120,200,255,.35)';for(let k=0;k<4;k++)g.fillRect(vx+4+k*9,vy+3,5,12);
  const wy=r[1]<1000?y-8:y+h+8;for(let lx=x+40;lx<x+w-30;lx+=60)if(!DR.some(d=>d[2]&&Math.abs(d[1]-wy)<30&&Math.abs(d[0]-lx)<48)){g.fillStyle='rgba(190,240,255,.85)';g.fillRect(lx-8,wy-1,16,3)}});
 CR.forEach(r=>{g.fillStyle='rgba(120,230,255,.8)';if(r[2]>r[3])for(let x=r[0]+60;x<r[0]+r[2]-50;x+=50){g.fillRect(x,r[1]-9,14,4);g.fillRect(x,r[1]+r[3]+5,14,4)}else for(let y=r[1]+60;y<r[1]+r[3]-50;y+=50){g.fillRect(r[0]-9,y,4,14);g.fillRect(r[0]+r[2]+5,y,4,14)}});
 [[620,1195,120,16,'#2a2140'],[870,1195,110,16,'#2a2140'],[1262,1195,70,16,'#3a2326'],[1770,1195,80,16,'#123a3a'],[118,1192,80,16,'#6b4a2a'],[1770,652,60,14,'#14284a']].forEach(([x,y,w,h,c],i)=>{g.fillStyle=c;g.strokeStyle='rgba(127,227,255,.7)';g.lineWidth=2;g.fillRect(x,y,w,h);g.strokeRect(x,y,w,h);if(i<3)for(let k=0;k<4;k++)LED.push([x+10+k*26,y+8,['#4f8','#fc4','#f55','#4cf'][k],Math.random()])});
 [[1790,116],[1815,116]].forEach(([x,y])=>ci(x,y,9,'#4a7a9a','#bfe8ff',2));
 [[630,870],[975,668],[1270,1415]].forEach(([x,y])=>{sh(x,y,11,9);ci(x,y,11,'#6a3a2a','#d98c5c',2);g.strokeStyle='#d98c5c';g.lineWidth=1.5;g.beginPath();g.arc(x,y,6,0,7);g.stroke()});
 [[975,125],[625,338],[1530,395]].forEach(([x,y])=>{sh(x,y,13,11);ci(x,y,13,'#2c7a3c','#9dfca8',2);ci(x,y,6,'#7fe38a')});
 c.ms=MS;return c}
function burst(x,y,c,n){for(let i=0;i<n;i++){const a=Math.random()*6.283,s=40+Math.random()*150;PT.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-50,l:.7+Math.random()*.5,c})}}
function dyn(t,dt,pts){const ST=ST0,pu=.5+.5*Math.sin(t*3);
 LED.forEach(l=>{if(!vs(l[0],l[1],6))return;cx.globalAlpha=.3+.7*Math.abs(Math.sin(t*2+l[3]*9));cx.fillStyle=l[2];cx.beginPath();cx.arc(l[0],l[1],2.6,0,7);cx.fill()});cx.globalAlpha=1;
 [[1359,170],[1402,170],[1445,170]].forEach((s,i)=>{if(!vs(s[0],s[1],20))return;cx.fillStyle=`rgba(80,255,255,${.25+.25*Math.sin(t*4+i)})`;cx.fillRect(s[0]-12,s[1]-8,24,16)});
 DR.forEach(([x,y,h],i)=>{const op=pts.some(p=>D(p.x,p.y,x,y)<115)?1:0;dop[i]+=(op-dop[i])*Math.min(1,dt*9);if(!vs(x,y,50))return;const L=7+33*(1-dop[i]);cx.fillStyle='#2f4d7d';cx.strokeStyle=dop[i]>.5?'#5f8':'#f66';cx.lineWidth=1.5;
  if(h){cx.fillRect(x-40,y-5,L,10);cx.strokeRect(x-40,y-5,L,10);cx.fillRect(x+40-L,y-5,L,10);cx.strokeRect(x+40-L,y-5,L,10)}else{cx.fillRect(x-5,y-40,10,L);cx.strokeRect(x-5,y-40,10,L);cx.fillRect(x-5,y+40-L,10,L);cx.strokeRect(x-5,y+40-L,10,L)}});
 let q;if(vs(800,770,110)){q=cx.createRadialGradient(800,770,4,800,770,72+pu*14);q.addColorStop(0,'rgba(190,255,225,.95)');q.addColorStop(.35,'rgba(40,255,160,.55)');q.addColorStop(1,'rgba(0,255,150,0)');cx.fillStyle=q;cx.fillRect(700,670,200,200);
 cx.strokeStyle='#7fffd0';cx.lineWidth=4;cx.setLineDash([18,12]);cx.lineDashOffset=-t*40;cx.beginPath();cx.arc(800,770,44,0,7);cx.stroke();cx.lineDashOffset=t*30;cx.lineWidth=3;cx.beginPath();cx.arc(800,770,31,0,7);cx.stroke();cx.setLineDash([]);cx.fillStyle='#eafff6';cx.beginPath();cx.arc(800,770,12+pu*3,0,7);cx.fill();
 }
 if(vs(250,170,70)){q=cx.createRadialGradient(250,170,4,250,170,60);q.addColorStop(0,`rgba(255,150,50,${.5+.3*pu})`);q.addColorStop(1,'rgba(255,100,0,0)');cx.fillStyle=q;cx.fillRect(190,110,120,120);
 cx.strokeStyle='#ffc58a';cx.lineWidth=5;cx.lineCap='round';for(let i=0;i<4;i++){const a=t*9+i*1.571;cx.beginPath();cx.moveTo(250,170);cx.lineTo(250+Math.cos(a)*22,170+Math.sin(a)*22);cx.stroke()}
 }
 if(vs(1400,280,60)){cx.strokeStyle=`rgba(120,255,255,${.6+.3*pu})`;cx.lineWidth=2;cx.beginPath();cx.ellipse(1400,284,22,8,t,0,7);cx.stroke();cx.beginPath();cx.ellipse(1400,278,14,5,-t*1.4,0,7);cx.stroke();cx.fillStyle='rgba(120,255,255,.12)';cx.beginPath();cx.moveTo(1388,290);cx.lineTo(1380,250);cx.lineTo(1420,250);cx.lineTo(1412,290);cx.fill();
 }
 if(vs(1500,740,60)){cx.strokeStyle='rgba(130,255,255,.8)';cx.lineWidth=2;const sy=716+(t*45%48);cx.beginPath();cx.moveTo(1476,sy);cx.lineTo(1524,sy);cx.stroke();
 }
 if(vs(180,830,40)&&Math.sin(t*13)>.55){cx.strokeStyle='#ffe66b';cx.lineWidth=2;cx.beginPath();for(let i=0;i<3;i++){const x=160+Math.random()*50-10,y=806+Math.random()*10;cx.moveTo(x,y);cx.lineTo(x+Math.random()*14-7,y-Math.random()*14)}cx.stroke()}
 if(vs(800,230,50)){q=cx.createRadialGradient(800,230,2,800,230,34);q.addColorStop(0,`rgba(255,40,40,${.5+.4*pu})`);q.addColorStop(1,'rgba(255,0,0,0)');cx.fillStyle=q;cx.fillRect(760,190,80,80);cx.fillStyle='#f23';cx.strokeStyle='#600';cx.lineWidth=2;cx.beginPath();cx.arc(800,230,13,0,7);cx.fill();cx.stroke();
 }
 if(vs(1900,230,50)){for(let i=0;i<5;i++){const a=t*.8+i*1.256;cx.fillStyle='rgba(120,255,140,.8)';cx.beginPath();cx.arc(1900+Math.cos(a)*30,230+Math.sin(a)*30-(t*20+i*12)%24,3,0,7);cx.fill()}
 cx.strokeStyle='rgba(120,255,140,.5)';cx.lineWidth=2;cx.beginPath();cx.arc(1900,230,26+Math.sin(t*2)*2,0,7);cx.stroke();
 }
 if(vs(1900,770,50)){cx.strokeStyle=`rgba(110,170,255,${.5+.4*pu})`;cx.lineWidth=3;for(let i=0;i<3;i++){cx.beginPath();for(let j=0;j<6;j++){const a=t*(i%2?-1:1)*.9+j*1.047+i*.3,r=18+i*8;j?cx.lineTo(1900+Math.cos(a)*r,770+Math.sin(a)*r):cx.moveTo(1900+Math.cos(a)*r,770+Math.sin(a)*r)}cx.closePath();cx.stroke()}
 cx.fillStyle='#bcd6ff';cx.beginPath();cx.arc(1900,770,5+pu*2,0,7);cx.fill();
 }
 if(vs(800,1310,50)){const ph=t%2.5;cx.strokeStyle=`rgba(200,140,255,${1-ph/2.5})`;cx.lineWidth=2;cx.beginPath();cx.arc(800,1310,12+ph*22,0,7);cx.stroke();cx.strokeStyle='#e0b8ff';cx.lineWidth=3;cx.beginPath();cx.moveTo(800,1310);cx.lineTo(800+Math.cos(t*2)*26,1310+Math.sin(t*2)*26);cx.stroke();
 }
 if(vs(1400,1300,170)){[1382,1416].forEach((x,i)=>{cx.fillStyle=`rgba(255,80,80,${.25+.35*Math.abs(Math.sin(t*5+i*2))})`;cx.fillRect(x-14,1290,28,18)});const sx=1250+t*70%300;cx.strokeStyle='rgba(255,60,60,.55)';cx.lineWidth=2;cx.beginPath();cx.moveTo(sx,1190);cx.lineTo(sx,1420);cx.stroke();
 }
 if(vs(1900,1320,40)){for(let i=0;i<6;i++){const y=1332-(t*28+i*13)%52;cx.fillStyle='rgba(150,255,230,.75)';cx.beginPath();cx.arc(1900+Math.sin(t*2+i*2)*14,y,2+i%3,0,7);cx.fill()}
 }
 if(vs(250,1290,10)){cx.fillStyle=Math.sin(t*6)>0?'#ffb347':'#5a3a10';cx.beginPath();cx.arc(250,1290,5,0,7);cx.fill()}
 if(S.sab&&!S.sab.done){const s=SB0[S.sab.k],b=Math.sin(t*5)*3;cx.strokeStyle=`rgba(255,60,60,${.9-.5*pu})`;cx.lineWidth=4;cx.beginPath();cx.arc(s[0],s[1],26+pu*12,0,7);cx.stroke();cx.fillStyle='#ff3b3b';cx.strokeStyle='#600';cx.lineWidth=2;cx.beginPath();cx.roundRect(s[0]-16,s[1]-16,32,32,6);cx.fill();cx.stroke();cx.fillStyle='#fff';cx.font='bold 22px sans-serif';cx.textAlign='center';cx.fillText('!',s[0],s[1]+8);cx.fillStyle='#ff3b3b';cx.beginPath();cx.moveTo(s[0]-8,s[1]-30+b);cx.lineTo(s[0]+8,s[1]-30+b);cx.lineTo(s[0],s[1]-22+b);cx.fill();cx.font='bold 15px sans-serif';cx.textAlign='center';cx.lineWidth=4;cx.strokeStyle='#000';cx.strokeText(SBN[S.sab.k][1],s[0],s[1]-38+b);cx.fillStyle='#fff';cx.fillText(SBN[S.sab.k][1],s[0],s[1]-38+b)}
 S.tk.forEach(k=>{if(k.d)return;const s=ST[k.i],b=Math.sin(t*5)*3;cx.strokeStyle=`rgba(255,216,74,${.8-.5*pu})`;cx.lineWidth=3;cx.beginPath();cx.arc(s[0],s[1],20+pu*8,0,7);cx.stroke();cx.fillStyle='#ffd84a';cx.strokeStyle='#7a5a00';cx.lineWidth=2;cx.beginPath();cx.roundRect(s[0]-14,s[1]-14,28,28,6);cx.fill();cx.stroke();cx.fillStyle='#000';cx.font='bold 20px sans-serif';cx.textAlign='center';cx.fillText('!',s[0],s[1]+7);cx.fillStyle='#ffd84a';cx.beginPath();cx.moveTo(s[0]-7,s[1]-26+b);cx.lineTo(s[0]+7,s[1]-26+b);cx.lineTo(s[0],s[1]-19+b);cx.fill()})}
function crew(x,y,c,f,al,lbl,red,sy=1,wk=0,mv=0){const b=mv?Math.abs(Math.sin(wk))*2.5:Math.sin(wk)*.8,sw=mv?Math.sin(wk)*4:0;
 cx.save();cx.globalAlpha=al*.4;cx.fillStyle='#000';cx.beginPath();cx.ellipse(x,y+24,19,6,0,0,7);cx.fill();cx.restore();
 cx.save();cx.translate(x,y-b);cx.scale(f,sy);cx.globalAlpha=al;cx.fillStyle=c;cx.strokeStyle='#000';cx.lineWidth=3;
 cx.fillRect(-14,12,11,12+sw);cx.fillRect(3,12,11,12-sw);cx.strokeRect(-14,12,11,12+sw);cx.strokeRect(3,12,11,12-sw);
 cx.beginPath();cx.roundRect(-26,-6,12,24,5);cx.fill();cx.stroke();
 cx.beginPath();cx.roundRect(-17,-26,34,42,[14,14,6,6]);cx.fill();cx.stroke();cx.save();cx.clip();cx.fillStyle='rgba(0,0,0,.24)';cx.fillRect(-17,3,34,20);cx.fillStyle='rgba(255,255,255,.2)';cx.fillRect(-17,-26,7,40);cx.restore();
 const vg=cx.createLinearGradient(0,-19,0,-6);vg.addColorStop(0,'#dff7ff');vg.addColorStop(1,'#4aa3cf');cx.fillStyle=vg;cx.beginPath();cx.roundRect(0,-19,20,13,6);cx.fill();cx.stroke();cx.fillStyle='rgba(255,255,255,.85)';cx.beginPath();cx.ellipse(14,-15,3.5,2,0,0,7);cx.fill();cx.restore();
 if(lbl){cx.globalAlpha=al;cx.font='bold 13px sans-serif';cx.textAlign='center';cx.lineWidth=3;cx.strokeStyle='#000';cx.strokeText(lbl,x,y-36);cx.fillStyle=red?'#f33':'#fff';cx.fillText(lbl,x,y-36);cx.globalAlpha=1}}
function draw(ts){requestAnimationFrame(draw);const t=ts/1e3,rw=t-(draw.p||t),dt=Math.min(.05,rw);draw.p=t;
 if(S&&(S.ph=='meet'||S.ph=='end'))return; /* tela coberta pela votação: não gasta GPU */
 adapt(rw);const dpr=Math.min(devicePixelRatio||1,1.5)*RS,W=innerWidth,Hh=innerHeight,cw=W*dpr|0,ch=Hh*dpr|0;if(cv.width!=cw||cv.height!=ch){cv.width=cw;cv.height=ch}
 cx.setTransform(dpr,0,0,dpr,0,0);cx.clearRect(0,0,W,Hh);if(!S||!gameOn)return;if(!MP)MP=bake();
 const z=Math.max(.6,Math.min(1.1,Math.min(W,Hh)/700)),Q=S.P.find(q=>q[0]==S.me),al=Q[4],k=1-Math.exp(-dt*16);
 /* jogador local: predição no cliente (resposta imediata) com correção suave pelo servidor */
 const o0=pp[S.me]||(pp[S.me]={x:Q[2],y:Q[3],mv:0,wk:0}),ex=o0.x,ey=o0.y;
 if(S.ph!='play'||D(o0.x,o0.y,Q[2],Q[3])>150){o0.x=Q[2];o0.y=Q[3]}
 else{const l=Math.hypot(lx,ly);if(l>.01)step(o0,lx,ly,dt);const e=D(o0.x,o0.y,Q[2],Q[3]),c=!l?Math.min(1,dt*9):e>45?Math.min(1,dt*4):0;o0.x+=(Q[2]-o0.x)*c;o0.y+=(Q[3]-o0.y)*c}
 o0.mv=D(o0.x,o0.y,ex,ey)/Math.max(dt,.001)>25;o0.wk=(o0.wk||0)+dt*(o0.mv?15:2);
 S.P.forEach(q=>{if(q[0]==S.me)return;const o=pp[q[0]]||(pp[q[0]]={x:q[2],y:q[3],mv:0,wk:0}),nx=o.x+(q[2]-o.x)*k,ny=o.y+(q[3]-o.y)*k;o.mv=D(nx,ny,o.x,o.y)/Math.max(dt,.001)>25;o.x=nx;o.y=ny;o.wk=(o.wk||0)+dt*(o.mv?15:2)});
 cx.fillStyle='#03050b';cx.fillRect(0,0,W,Hh);STR.forEach(s=>{cx.globalAlpha=.35+.4*Math.sin(t*2+s[3]);cx.fillStyle='#bfe8ff';cx.fillRect(((s[0]*W-o0.x*.12*s[2])%W+W)%W,((s[1]*Hh-o0.y*.12*s[2])%Hh+Hh)%Hh,s[2],s[2])});cx.globalAlpha=1;
 VR=[(o0.x-W/2/z)/K-70,(o0.y-Hh/2/z)/K-70,(o0.x+W/2/z)/K+70,(o0.y+Hh/2/z)/K+70];const vw=W/2/z+60,vh=Hh/2/z+60,inV=o=>Math.abs(o.x-o0.x)<vw&&Math.abs(o.y-o0.y)<vh;
 cx.save();cx.translate(W/2-o0.x*z,Hh/2-o0.y*z);cx.scale(z,z);{const ms=MP.ms,hw=W/2/z+6,hh=Hh/2/z+6,x0=Math.max(0,Math.floor(((o0.x-hw)/K-MX)*ms)),y0=Math.max(0,Math.floor(((o0.y-hh)/K-MY)*ms)),x1=Math.min(MP.width,Math.ceil(((o0.x+hw)/K-MX)*ms)),y1=Math.min(MP.height,Math.ceil(((o0.y+hh)/K-MY)*ms));
 if(x1>x0&&y1>y0){cx.save();cx.scale(K,K);cx.drawImage(MP,x0,y0,x1-x0,y1-y0,MX+x0/ms,MY+y0/ms,(x1-x0)/ms,(y1-y0)/ms);cx.restore()}}
 if(S.B.length<lastB)lastB=S.B.length;if(S.B.length>lastB)S.B.slice(lastB).forEach(b=>burst(b[0],b[1],COL[b[2]],26));lastB=S.B.length;
 if(!DS)DS=new Set(S.tk.filter(q=>q.d).map(q=>q.i));else S.tk.forEach(q=>{if(q.d&&!DS.has(q.i)){DS.add(q.i);burst(ST[q.i][0],ST[q.i][1],'#6f6',24)}});
 cx.save();cx.scale(K,K);dyn(t,dt,Object.values(pp).map(p=>({x:p.x/K,y:p.y/K})));cx.restore();
 S.B.forEach(b=>vs(b[0]/K,b[1]/K,40)&&crew(b[0],b[1]+8,COL[b[2]],1,1,'',0,.45));
 S.P.filter(q=>(q[4]||!al)&&(q[0]==S.me||inV(pp[q[0]]))).sort((a,b)=>pp[a[0]].y-pp[b[0]].y).forEach(q=>{const o=pp[q[0]];crew(o.x,o.y,COL[q[0]],q[5],q[4]?1:.45,q[1],S.r=='i'&&q[6],1,o.wk,o.mv)});
 for(let i=PT.length-1;i>=0;i--){const p=PT[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=260*dt;if((p.l-=dt)<=0){PT.splice(i,1);continue}cx.globalAlpha=Math.min(1,p.l*2);cx.fillStyle=p.c;cx.fillRect(p.x-2,p.y-2,4,4)}cx.globalAlpha=1;cx.restore();
 if(al){const R=(S.lt&&S.r!='i'?150:420)*z;vig('d'+W+'x'+Hh+'x'+(R|0),W,Hh,R*.5,R,'rgba(5,6,12,0)','#05060c',1)}
 if(S.lt||S.sab)vig('r'+W+'x'+Hh,W,Hh,Math.min(W,Hh)*.3,Math.max(W,Hh)*.7,'rgba(255,0,0,0)','rgba(255,30,30,1)',.25+.2*Math.sin(t*7));
 if(S.sab&&!S.sab.done&&S.r!='i'&&al){const st=SB[S.sab.k],dx=st[0]-o0.x,dy=st[1]-o0.y,sx=dx*z,sy=dy*z,hx=W/2-44,hy=Math.max(40,Hh/2-96);
  if(Math.abs(sx)>hx||Math.abs(sy)>hy){const k=Math.min(hx/(Math.abs(sx)||1e-6),hy/(Math.abs(sy)||1e-6)),ax=W/2+sx*k,ay=Hh/2+sy*k,an=Math.atan2(dy,dx),pl=.8+.2*Math.sin(t*9);
   cx.save();cx.translate(ax,ay);cx.scale(pl,pl);cx.rotate(an);cx.fillStyle='#ff3b3b';cx.strokeStyle='#fff';cx.lineWidth=3;cx.shadowColor='#f33';cx.shadowBlur=14;cx.beginPath();cx.moveTo(24,0);cx.lineTo(-12,-17);cx.lineTo(-5,0);cx.lineTo(-12,17);cx.closePath();cx.fill();cx.stroke();cx.restore();
   const nm=SBN[S.sab.k][1],tx=Math.min(W-50,Math.max(50,ax-Math.cos(an)*44)),ty=ay-Math.sin(an)*34;cx.font='bold 13px sans-serif';cx.textAlign='center';cx.lineWidth=4;cx.strokeStyle='#000';cx.strokeText(nm,tx,ty);cx.fillStyle='#fff';cx.fillText(nm,tx,ty)}}
 {cx.save();cx.translate(W-118,10);cx.fillStyle='rgba(3,8,20,.7)';cx.fillRect(-4,-4,114,82);cx.strokeStyle='#00e5ff88';cx.lineWidth=1;cx.strokeRect(-4,-4,114,82);cx.fillStyle='#2a4f80';FL.forEach(r=>cx.fillRect((r[0]/K-100)*.055,(r[1]/K-100)*.055,r[2]/K*.055,r[3]/K*.055));cx.fillStyle='#ffd84a';S.tk.forEach(q=>{if(!q.d)cx.fillRect((ST[q.i][0]/K-100)*.055-1.5,(ST[q.i][1]/K-100)*.055-1.5,3,3)});if(S.sab&&!S.sab.done){cx.fillStyle=Math.sin(t*8)>0?'#f33':'#fff';cx.fillRect((SB0[S.sab.k][0]-100)*.055-2.5,(SB0[S.sab.k][1]-100)*.055-2.5,5,5)}cx.fillStyle=Math.sin(t*6)>0?'#fff':'#f55';cx.beginPath();cx.arc((o0.x/K-100)*.055,(o0.y/K-100)*.055,3,0,7);cx.fill();cx.restore()}
 if(J0&&J){cx.strokeStyle='#00e5ffaa';cx.lineWidth=3;cx.beginPath();cx.arc(J0.x,J0.y,48,0,7);cx.stroke();cx.fillStyle='#00e5ff66';cx.beginPath();cx.arc(J0.x+J.x*40,J0.y+J.y*40,22,0,7);cx.fill()}}
requestAnimationFrame(draw);
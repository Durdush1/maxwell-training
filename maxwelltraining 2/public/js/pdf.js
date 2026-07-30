'use strict';
/**
 * Maxwell Training — PDF Generator
 * Uses jsPDF to generate dark-theme workout PDFs.
 * Data comes from window.A (athlete) and window.genPlanText (plan).
 */

function makePDF(){
  if(typeof window.jspdf==='undefined') throw new Error('jsPDF not loaded');
  const{jsPDF}=window.jspdf;

  function cl(t){return String(t||'').replace(/\*\*/g,'').replace(/\*/g,'').replace(/^#+\s*/,'').trim();}
  function r5(n){return Math.max(5,Math.round(n/5)*5);}
  function num(s){return parseInt(String(s||'').replace(/[^\d]/g,''))||0;}

  const nm=cl(A.fname||localStorage.getItem('mt_nm')||'Athlete');
  const lvl=cl(A.level||'intermediate');
  const days=parseInt(A.days)||4;
  const hrs=parseInt(A.hours)||60;
  const sq=num(A.squat),bp=num(A.bench),dl=num(A.deadlift),pu=num(A.pullups)||8;
  const sqS=sq?r5(sq*0.72):115,bpS=bp?r5(bp*0.72):95,dlS=dl?r5(dl*0.72):135;
  const wt=num(A.weight)||180;
  const prot=wt,cals=r5(wt*16/5)*5,carbs=r5(wt*2),fats=r5(wt*0.45);
  const dipWt=bp>160?'BW + 25lbs':bp>120?'BW + 10lbs':'Bodyweight';
  const puWt=pu>10?'BW + '+r5(pu*1.2)+'lbs':pu>5?'Bodyweight':'Band-assisted';

  const BG=[14,14,20],CARD=[26,26,36],C2=[34,34,46];
  const INK=[235,233,228],MID=[128,126,146],LITE=[76,74,92];
  const RED=[218,48,58],GRN=[38,180,92],BLU=[54,124,226],GOLD=[208,162,48];
  const W=210,ML=14,CW=182;
  const NW=72,SW=34,RS=22,TK=20,TOT=NW+SW+RS+TK;

  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  let pg=0;

  function newPage(){
    if(pg>0){addFooter();doc.addPage();}
    pg++;
    doc.setFillColor(...BG);doc.rect(0,0,W,297,'F');
  }
  function addFooter(){
    doc.setFillColor(...CARD);doc.rect(0,286,W,11,'F');
    doc.setFont('helvetica','normal');doc.setFontSize(6.5);doc.setTextColor(...MID);
    doc.text('Maxwell Training  --  '+nm,ML,290.5);
    doc.text(String(pg),W-ML,290.5,{align:'right'});
  }
  function bx(x,y,w,h,fill){doc.setFillColor(...fill);doc.rect(x,y,w,h,'F');}
  function t(x,y,text,sz,bold,col,align,maxW){
    doc.setFont('helvetica',bold?'bold':'normal');
    doc.setFontSize(sz||8);doc.setTextColor(...(col||INK));
    const s=cl(text).substring(0,120);
    doc.text(s,x,y,{align:align||'left',maxWidth:maxW||(W-x-ML)});
  }
  function calcRowH(cue){
    doc.setFont('helvetica','normal');doc.setFontSize(6.2);
    const lines=doc.splitTextToSize(cl(cue),NW-14);
    const nLines=Math.min(lines.length,2);
    // name=6 + weight=6 + cue lines + padding
    return Math.max(22, 4+6+6+nLines*5+5);
  }

  // COVER
  newPage();
  bx(0,0,W,5,RED);
  t(ML,27,'Maxwell',46,true,RED);t(ML,51,'Training',46,true,INK);
  bx(ML,77,88,1.5,RED);
  t(ML,84,'PROGRAM BUILT FOR',6.5,false,MID);
  t(ML,92,nm.toUpperCase(),18,true,INK);
  t(ML,105,lvl+' -- '+days+' days/week -- '+hrs+' min sessions',8,false,MID);
  if(A.playsport==='yes'&&A.sport)t(ML,112,cl(A.sport)+' -- '+cl(A.position||'')+' -- '+cl(A.season||''),7.5,false,MID);

  var macros=[['PROTEIN',prot+'g'],['CALORIES',cals.toLocaleString()],['CARBS',carbs+'g'],['FATS',fats+'g']];
  macros.forEach(function([lbl,val],i){
    var bxX=ML+i*45;
    bx(bxX,121,43,30,CARD);bx(bxX,121,43,2,RED);
    t(bxX+3,127,lbl,5.5,false,MID);t(bxX+3,133,val,15,true,RED);t(bxX+3,143,'per day',5.5,false,LITE);
  });

  bx(ML,159,CW,56,CARD);bx(ML,159,CW,2,GOLD);
  t(ML+4,165,'YOUR STARTING WEIGHTS',7,true,GOLD);
  t(ML+4,172,'All weights rounded to nearest 5lbs. Load them with any standard gym plates.',6.5,false,MID);
  var lifts=[['Squat',sqS+'lbs',sq?'72% of your '+sq+'lb max -- add 5lbs each week':'estimated for your level'],
    ['Bench Press',bpS+'lbs',bp?'72% of your '+bp+'lb max -- heavy strength sets':'estimated for your level'],
    ['Deadlift',dlS+'lbs',dl?'72% of your '+dl+'lb max -- hip hinge focus':'estimated for your level'],
    ['Dips',dipWt,'Lean forward for chest. Full range of motion.'],
    ['Pull-Ups',puWt,pu>8?'You do '+pu+' reps -- add weight each week':'Build to 8 reps then add weight']];
  lifts.forEach(function([lift,wt2,note],j){
    var ly=180+j*8;
    t(ML+4,ly,lift,8,true,INK);t(ML+44,ly,wt2,11,true,GOLD);t(ML+78,ly,note,6.5,false,MID);
  });
  t(ML+4,222,'Add 5lbs per week when you complete all reps with good form.',6.5,false,MID);

  t(ML,231,'YOUR WEEKLY SCHEDULE',7,true,RED);
  // Build schedule based on training days
  var scheduleMap={
    2:[{d:'MON',f:'Training',c:RED},{d:'TUE',f:'REST',c:LITE},{d:'WED',f:'Training',c:RED},{d:'THU',f:'REST',c:LITE},{d:'FRI',f:'REST',c:LITE},{d:'SAT',f:'REST',c:LITE},{d:'SUN',f:'REST',c:LITE}],
    3:[{d:'MON',f:'Training',c:RED},{d:'TUE',f:'REST',c:LITE},{d:'WED',f:'Training',c:RED},{d:'THU',f:'REST',c:LITE},{d:'FRI',f:'Training',c:RED},{d:'SAT',f:'REST',c:LITE},{d:'SUN',f:'REST',c:LITE}],
    4:[{d:'MON',f:'Training',c:RED},{d:'TUE',f:'Training',c:RED},{d:'WED',f:'REST',c:LITE},{d:'THU',f:'Training',c:RED},{d:'FRI',f:'Training',c:RED},{d:'SAT',f:'REST',c:LITE},{d:'SUN',f:'REST',c:LITE}],
    5:[{d:'MON',f:'Training',c:RED},{d:'TUE',f:'Training',c:RED},{d:'WED',f:'Active',c:GRN},{d:'THU',f:'Training',c:RED},{d:'FRI',f:'Training',c:RED},{d:'SAT',f:'Conditioning',c:BLU},{d:'SUN',f:'REST',c:LITE}],
    6:[{d:'MON',f:'Training',c:RED},{d:'TUE',f:'Training',c:RED},{d:'WED',f:'Training',c:RED},{d:'THU',f:'REST',c:LITE},{d:'FRI',f:'Training',c:RED},{d:'SAT',f:'Training',c:RED},{d:'SUN',f:'Training',c:RED}]
  };
  var sched=scheduleMap[days]||scheduleMap[4];
  var dw2=CW/7;
  sched.forEach(function(day,i){
    var x=ML+i*dw2;var isR=day.c===LITE;
    bx(x,237,dw2-0.5,22,isR?BG:CARD);bx(x,237,dw2-0.5,2,day.c);
    doc.setFont('helvetica','bold');doc.setFontSize(5.5);doc.setTextColor(...day.c);
    doc.text(day.d,x+dw2/2,241.5,{align:'center'});
    doc.setFont('helvetica','normal');doc.setFontSize(5);doc.setTextColor(...(isR?LITE:MID));
    doc.text(day.f,x+dw2/2,246,{align:'center'});
  });

  var ntim=[['Before training','Carbs + protein. Oats + shake. Rice + chicken.'],
    ['After training','Protein + carbs. Shake + banana. Chicken + rice.'],
    ['Before bed','Greek yoghurt or cottage cheese. Slow protein overnight.'],
    ['Creatine','5g daily with any meal. Most proven supplement.']];
  ntim.forEach(function([wh,wt3],k){
    var yy=265+k*5.3;bx(ML,yy,CW,5,CARD);
    t(ML+2,yy+3.2,wh,6,true,INK);t(ML+48,yy+3.2,wt3,6,false,MID);
  });
  t(ML,279,'On rest days: 20-30 min easy walk or light mobility work only. No heavy lifting.',6.5,false,MID);
  t(ML,286,'maxwelltraining.netlify.app  --  @Maxwell__Training',6.5,false,LITE);

  // PARSE PLAN INTO DAY SECTIONS
  var planLines=genPlanText.split(String.fromCharCode(10));
  var sections=[];var cur=null;var curPhase='Phase 1';
  planLines.forEach(function(line){
    var raw=line.trim();
    var stripped=cl(raw);
    // Detect phase headers
    if(raw.match(/^##\s*PHASE\s*(1|2|3|ONE|TWO|THREE)|ACCUMULATION|INTENSIFICATION|PEAK/i)&&!raw.match(/^###/)){
      if(stripped.toLowerCase().includes('accumulation')||stripped.includes('Phase 1')||stripped.includes('PHASE 1'))curPhase='ACCUMULATION';
      else if(stripped.toLowerCase().includes('intensif')||stripped.includes('Phase 2')||stripped.includes('PHASE 2'))curPhase='INTENSIFICATION';
      else if(stripped.toLowerCase().includes('peak')||stripped.includes('Phase 3')||stripped.includes('PHASE 3'))curPhase='PEAK';
      return;
    }
    // Detect day headers
    if(raw.match(/^###?\s*(DAY\s*\d+|MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SESSION\s*\d+)/i)){
      if(cur)sections.push(cur);
      cur={header:stripped.replace(/^#+\s*/,''),phase:curPhase,lines:[],warm:[],exs:[],cool:[]};
    } else if(cur){
      cur.lines.push(line);
    }
  });
  if(cur)sections.push(cur);

  sections.forEach(function(sec){
    var mode='none';
    sec.lines.forEach(function(line){
      var raw=line.trim();var lower=raw.toLowerCase();var stripped=cl(raw);
      if(!stripped)return;
      if(lower.includes('warm-up')||lower.includes('warm up')){mode='warm';return;}
      if(lower.includes('cool-down')||lower.includes('cool down')){mode='cool';return;}
      if(lower.includes('main work')||lower.includes('training block')||lower.includes('strength block')||lower.includes('power block')||lower.includes('sprint')||lower.includes('conditioning block')){mode='table';return;}
      if(raw.includes('|')){
        var cells=raw.split('|').slice(1,-1).map(function(c){return cl(c);});
        var joined=cells.join('').replace(/[-:\s]/g,'');
        if(!joined)return;
        if(cells[0].toLowerCase().includes('exercise')||cells[0].toLowerCase().includes('sets')||cells[0]==='#')return;
        if(cells.length>=2){sec.exs.push(cells);mode='table';}
        return;
      }
      if((raw.startsWith('-')||raw.startsWith('*'))&&stripped.length>2){
        var item=stripped.replace(/^[-*]\s*/,'');
        // Skip goal lines that got mixed into warm-up
        if(item.toLowerCase().startsWith('goal:'))return;
        if(item.length<4)return; // skip "--" and other garbage
        if(mode==='warm')sec.warm.push(item);
        else if(mode==='cool')sec.cool.push(item);
        else if(mode==='none'&&sec.warm.length<6)sec.warm.push(item);
      }
    });
  });

  function dayAccent(h){
    var l=h.toLowerCase();
    if(l.includes('run')||l.includes('condition')||l.includes('sprint'))return BLU;
    if(l.includes('explos')||l.includes('jump')||l.includes('power'))return GRN;
    return RED;
  }

  // Determine week count
  var weekCount=12;
  var durKey=String(A.duration||'12weeks');
  if(durKey.includes('4'))weekCount=4;
  else if(durKey.includes('8'))weekCount=8;
  else if(durKey.includes('16'))weekCount=16;

  function renderDay(sec,dayIdx,weekNum){
    var acc=dayAccent(sec.header);
    newPage();

    // Banner
    bx(0,0,W,50,CARD);bx(0,0,4,50,acc);bx(0,49,W,1.5,acc);
    var hparts=sec.header.split(/\s*--\s*|\s*:\s*/);
    // Extract actual day name from header (MONDAY, TUESDAY etc)
    var dayNames=['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];
    var actualDay='';
    dayNames.forEach(function(dn){if(sec.header.toUpperCase().includes(dn))actualDay=dn;});
    // Fallback: assign day name by index
    if(!actualDay){
      var dayByIdx=['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
      actualDay=dayByIdx[dayIdx]||'DAY '+(dayIdx+1);
    }
    var phaseLabel=sec.phase&&sec.phase!=='Phase 1'?sec.phase+' -- ':'';
    var weekLabel=weekNum>1?'WEEK '+weekNum+'  --  ':'';
    var topLabel=weekLabel+phaseLabel+'DAY '+(dayIdx+1);
    // Session type from header
    var sessType=cl(hparts[1]||hparts[0]||'Training').replace(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday|day\s*\d+)/gi,'').trim().toUpperCase();
    if(!sessType||sessType.length<3)sessType=cl(hparts[2]||hparts[1]||'Training').toUpperCase();

    // Banner layout: top-left = day label, big center = DAY NAME, right = session type + time
    t(10,6,topLabel,7,true,acc);
    // BIG day name
    doc.setFont('helvetica','bold');doc.setFontSize(22);doc.setTextColor(...INK);
    doc.text(actualDay,10,20);
    // Session type below day name
    doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...MID);
    doc.text(sessType.substring(0,50),10,30,{maxWidth:140});
    t(W-ML-22,6,hrs+' MIN',7,true,acc);

    var y=55;

    // Warm-up
    var warmItems=sec.warm.slice(0,5);
    if(warmItems.length===0)warmItems=['Dynamic stretching and mobility  5 min'];
    var wh=7+warmItems.length*5.0;
    bx(ML,y,CW,wh,[10,28,16]);bx(ML,y,3,wh,GRN);
    doc.setFont('helvetica','bold');doc.setFontSize(6.5);doc.setTextColor(...GRN);
    doc.text('WARM-UP  (10 min)',ML+5,y+4.5);
    var wy=y+9.5;
    warmItems.forEach(function(w){
      doc.setFont('helvetica','normal');doc.setFontSize(6.2);doc.setTextColor(90,195,125);
      doc.text('--  '+cl(w).substring(0,84),ML+6,wy);wy+=5.0;
    });
    y+=wh+4;

    // Table header
    var HDR=9;
    bx(ML,y,TOT,HDR,[10,10,22]);
    doc.setFont('helvetica','bold');doc.setFontSize(5.5);doc.setTextColor(155,153,175);
    doc.text('EXERCISE  /  WEIGHT  /  COACHING CUE',ML+3,y+5.8);
    doc.setDrawColor(...LITE);doc.setLineWidth(0.05);
    doc.line(ML+NW,y,ML+NW,y+HDR);
    doc.text('SETS x REPS',ML+NW+SW/2,y+5.8,{align:'center'});
    doc.line(ML+NW+SW,y,ML+NW+SW,y+HDR);
    doc.text('REST',ML+NW+SW+RS/2,y+5.8,{align:'center',maxWidth:RS-2});
    doc.line(ML+NW+SW+RS,y,ML+NW+SW+RS,y+HDR);
    doc.text('TRACK',ML+NW+SW+RS+TK/2,y+5.8,{align:'center'});
    y+=HDR;

    var LETTERS='ABCDEFGH';
    var exRows=sec.exs.slice(0,6);
    if(exRows.length===0){
      for(var ri=0;ri<5;ri++){
        bx(ML,y,TOT,18,ri%2===0?CARD:C2);y+=18;
      }
    } else {
      exRows.forEach(function(cells,ri){
        // Parse columns -- AI format: |letter|name|sets|reps|weight|rest|cue|
        var exName,setsReps,startWt,restT,cue;
        var c0=cl(cells[0]||'');
        if(c0.length<=2&&cells.length>=6){
          exName=cl(cells[1]||'');
          var s2=cl(cells[2]||''),s3=cl(cells[3]||'');
          setsReps=(s2&&s3)?s2+' x '+s3:(s2||s3);
          // Round weight to nearest 5
          var rawWt=cl(cells[4]||'');
          var wtNum=parseInt(rawWt.replace(/[^\d]/g,''));
          // If weight contains bodyweight keywords or number is unrealistic (>600lbs), keep as text
          var isBW=rawWt.toLowerCase().includes('body')||rawWt.toLowerCase().includes('bw')||rawWt.toLowerCase().includes('band');
          if(isBW){startWt=rawWt;}
          else if(wtNum&&wtNum<=600){startWt=r5(wtNum)+'lbs';}
          else if(wtNum>600){startWt=rawWt.replace(/\d+/,function(m){return parseInt(m)<=600?r5(parseInt(m)):m;});}
          else{startWt=rawWt;}
          restT=cl(cells[5]||'');
          cue=cl(cells[6]||'');
        } else if(cells.length>=5){
          exName=c0;
          setsReps=cl(cells[1]||'');
          var rawWt2=cl(cells[2]||'');
          var wtNum2=parseInt(rawWt2.replace(/[^\d]/g,''));
          var isBW2=rawWt2.toLowerCase().includes('body')||rawWt2.toLowerCase().includes('bw')||rawWt2.toLowerCase().includes('band');
          if(isBW2){startWt=rawWt2;}
          else if(wtNum2&&wtNum2<=600){startWt=r5(wtNum2)+'lbs';}
          else{startWt=rawWt2;}
          restT=cl(cells[3]||'');
          cue=cl(cells[4]||'');
        } else {
          exName=c0;setsReps=cl(cells[1]||'');startWt=cl(cells[2]||'');restT=cl(cells[3]||'');cue=cl(cells[4]||'');
        }
        if(!setsReps||setsReps==='x')setsReps=cl(cells[1]||'');

        // DYNAMIC ROW HEIGHT -- expands to fit cue text
        var RH=calcRowH(cue);

        var rbg=ri%2===0?CARD:C2;
        bx(ML,y,TOT,RH,rbg);
        doc.setDrawColor(...LITE);doc.setLineWidth(0.05);doc.rect(ML,y,TOT,RH,'D');

        // Badge
        bx(ML,y,7,RH,acc);
        doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(255,255,255);
        doc.text(LETTERS[ri],ML+3.5,y+RH/2+2,{align:'center'});

        // Name
        doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setTextColor(...INK);
        var nameLines=doc.splitTextToSize(exName,NW-12);
        doc.text(nameLines[0]||'',ML+9,y+6);

        // Weight in gold -- rounded
        doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setTextColor(...GOLD);
        doc.text('Weight: '+startWt.substring(0,26),ML+9,y+12.5);

        // Cue -- wraps to fit, NEVER cuts off
        doc.setFont('helvetica','normal');doc.setFontSize(6.2);doc.setTextColor(...MID);
        var cueLines=doc.splitTextToSize(cue,NW-13);
        var cyOff=y+19;
        cueLines.slice(0,2).forEach(function(cl2){
          doc.text(cl2,ML+9,cyOff);cyOff+=5;
        });

        // Dividers
        [NW,NW+SW,NW+SW+RS].forEach(function(dx){
          doc.setDrawColor(...LITE);doc.setLineWidth(0.05);
          doc.line(ML+dx,y,ML+dx,y+RH);
        });

        // Sets x Reps
        doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.setTextColor(...INK);
        doc.text(setsReps.substring(0,12),ML+NW+SW/2,y+RH/2+1.5,{align:'center',maxWidth:SW-2});

        // Rest
        doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(...MID);
        doc.text(restT.substring(0,8),ML+NW+SW+RS/2,y+RH/2+1,{align:'center',maxWidth:RS-2});

        // Track boxes
        var BX=ML+NW+SW+RS+1;var BW3=(TK-2)/3;
        for(var b=0;b<3;b++){
          bx(BX+b*BW3,y+2,BW3-0.5,RH-4,[18,18,30]);
          doc.setDrawColor(52,52,72);doc.setLineWidth(0.05);
          doc.rect(BX+b*BW3,y+2,BW3-0.5,RH-4,'D');
        }
        y+=RH;
      });
    }

    // Cool-down pinned to bottom
    var coolItems=sec.cool.slice(0,5);
    if(coolItems.length===0)coolItems=['Full body stretch  5 min'];
    var cdh=7+coolItems.length*5;var cdy=283-cdh;
    bx(ML,cdy,CW,cdh,[10,14,34]);bx(ML,cdy,3,cdh,BLU);
    doc.setFont('helvetica','bold');doc.setFontSize(6.5);doc.setTextColor(...BLU);
    doc.text('COOL-DOWN  (5-8 min)',ML+5,cdy+4.5);
    var coY=cdy+9.5;
    coolItems.forEach(function(item){
      doc.setFont('helvetica','normal');doc.setFontSize(6.2);doc.setTextColor(90,135,210);
      doc.text('--  '+cl(item).substring(0,84),ML+6,coY);coY+=5;
    });
  }

  // Group sections by phase for proper weekly repetition
  var phaseGroups={};
  sections.forEach(function(sec){
    var ph=sec.phase||'Phase 1';
    if(!phaseGroups[ph])phaseGroups[ph]=[];
    phaseGroups[ph].push(sec);
  });
  var phaseNames=Object.keys(phaseGroups);
  // Calculate weeks per phase
  var weeksPerPhase=Math.max(3,Math.floor((weekCount-phaseNames.length)/phaseNames.length));
  if(sections.length===0){
    newPage();
    doc.setFont('helvetica','bold');doc.setFontSize(14);doc.setTextColor(...INK);
    doc.text('Your Training Plan',ML,30);
    var ty=42;
    planLines.forEach(function(line){
      if(ty>280){addFooter();doc.addPage();pg++;bx(0,0,W,297,'F');ty=20;}
      var s=cl(line.trim());if(!s){ty+=3;return;}
      if(line.match(/^###/)){doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(...RED);doc.text(s.substring(0,80),ML,ty);ty+=8;}
      else if(line.match(/^##/)){doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...RED);doc.text(s.substring(0,80),ML,ty);ty+=7;}
      else if(line.startsWith('-')){doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(...MID);doc.text('-- '+s.replace(/^-\s*/,'').substring(0,80),ML,ty);ty+=5;}
      else if(!line.includes('|')){doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(...INK);var wl=doc.splitTextToSize(s,CW);doc.text(wl[0]||'',ML,ty);ty+=5;}
    });
  } else if(phaseNames.length>1){
    // Periodized program -- render each phase separately
    var weekNum=1;
    phaseNames.forEach(function(phaseName,pi){
      var phaseSecs=phaseGroups[phaseName];
      var wks=pi<phaseNames.length-1?weeksPerPhase:Math.max(3,weekCount-weekNum+1);
      for(var w=1;w<=wks&&weekNum<=weekCount;w++,weekNum++){
        phaseSecs.forEach(function(sec,di){renderDay(sec,di,weekNum);});
        // Deload after each phase (every 3-4 weeks)
        if(w===wks&&pi<phaseNames.length-1){
          weekNum++;
        }
      }
    });
  } else {
    for(var w=1;w<=weekCount;w++){
      sections.forEach(function(sec,di){renderDay(sec,di,w);});
    }
  }

  // NOTES PAGE
  newPage();
  bx(0,0,W,5,RED);
  doc.setFont('helvetica','bold');doc.setFontSize(22);doc.setTextColor(...INK);
  doc.text('Coaching Notes',ML,17);
  var ny=29;
  var notesArr=[
    ['Add weight every week','Start at the weights on the cover page. Hit ALL reps with good form -- add 5lbs to barbells, 2.5lbs to dumbbells. All weights are rounded to the nearest 5lbs so you can always load them. Miss any reps -- stay at the same weight one more week.'],
    ['Dips','Include weighted dips on every push day. Lean forward for chest emphasis. Stay upright for tricep emphasis. Add 5lbs every 2 weeks. One of the best exercises available.'],
    ['Deload weeks 4 and 8','Drop all weights 40%, cut sets by 1. Non-negotiable. This is when your body grows. Skip it and you plateau.'],
    ['12-week structure','Weeks 1-3: Build. Week 4: Deload. Weeks 5-7: Heavier. Week 8: Deload. Weeks 9-11: Peak. Week 12: Test all maxes.'],
    ['Kettlebells','KB swings are about explosive hip extension -- not squatting. KB Turkish get-up is slow and deliberate. KB clean and press builds shoulder stability you cannot get from machines.'],
    ['Sleep','7-9 hours every night. Muscle is built during sleep. Non-negotiable.'],
    ['Missed session','Do not double up. Continue where you left off. Two missed in a row -- reduce weights 10% next session.'],
  ];
  notesArr.forEach(function([title,body]){
    var blines=doc.splitTextToSize(body,CW-12);
    var bh=7+blines.length*4.2;
    if(ny>280-bh)return;
    bx(ML,ny,CW,bh,CARD);bx(ML,ny,3,bh,RED);
    doc.setFont('helvetica','bold');doc.setFontSize(7.5);doc.setTextColor(...INK);
    doc.text(title,ML+6,ny+5);
    doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(...MID);
    blines.forEach(function(bl,bi){doc.text(bl,ML+6,ny+10.5+bi*4.2);});
    ny+=bh+5;
  });
  bx(ML,ny+4,CW,22,CARD);bx(ML,ny+4,CW,2,RED);
  doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(...INK);
  doc.text('Maxwell Ionita  --  Maxwell Training',ML+CW/2,ny+13,{align:'center'});
  doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(...MID);
  doc.text('@Maxwell__Training  --  maxwelltraining.netlify.app',ML+CW/2,ny+20,{align:'center'});

  addFooter();
  doc.save('MaxwellTraining_'+nm.replace(/\s+/g,'_')+'_Plan.pdf');

  // Email confirmation
  try{
    var em=A.email||localStorage.getItem('mt_em')||'';
    if(em&&em.indexOf('@')>-1){
      emailjs.send('service_n5840dn','template_qp1lxh9',{name:nm,email:em,
        message:'Your Maxwell Training plan has been downloaded. Save it to your Notes or Files app.\n\nMaxwell Ionita\nMaxwell Training',
        title:'Your Maxwell Training Plan is Ready'}).catch(function(){});
    }
  }catch(e){}
}

window.makePDF = makePDF;

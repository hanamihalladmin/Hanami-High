export const HANAMI_ROLEPLAY_YEAR=2006;
export const HANAMI_SCHOOL_YEAR="2006–07";
export const HANAMI_FIRST_DAY_ISO="2006-04-07";
export const HANAMI_TIME_ZONE="Asia/Tokyo";
export const HANAMI_REAL_ANCHOR_ISO="2026-08-21";

function dayNumber(iso:string){const [year,month,day]=iso.split("-").map(Number);return Math.floor(Date.UTC(year,month-1,day)/86400000);}
function tokyoParts(now:Date){const parts=new Intl.DateTimeFormat("en-CA",{timeZone:HANAMI_TIME_ZONE,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(now);const read=(type:Intl.DateTimeFormatPartTypes)=>Number(parts.find(part=>part.type===type)?.value??0);return {year:read("year"),month:read("month"),day:read("day"),hour:read("hour"),minute:read("minute"),second:read("second")};}

export function hanamiRoleplayNow(now=new Date()){
  const real=tokyoParts(now);
  const realToday=Math.floor(Date.UTC(real.year,real.month-1,real.day)/86400000);
  const delta=realToday-dayNumber(HANAMI_REAL_ANCHOR_ISO);
  const yearStart=dayNumber("2006-01-01");
  const anchor=dayNumber(HANAMI_FIRST_DAY_ISO);
  const wrapped=((anchor+delta-yearStart)%365+365)%365;
  const roleplayDay=new Date((yearStart+wrapped)*86400000);
  const y=roleplayDay.getUTCFullYear(),m=String(roleplayDay.getUTCMonth()+1).padStart(2,"0"),d=String(roleplayDay.getUTCDate()).padStart(2,"0");
  const hh=String(real.hour).padStart(2,"0"),mm=String(real.minute).padStart(2,"0"),ss=String(real.second).padStart(2,"0");
  return new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}+09:00`);
}

export function hanamiRoleplayDate(now=new Date()){
  const value=new Intl.DateTimeFormat("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit",hour12:true,timeZone:HANAMI_TIME_ZONE}).format(hanamiRoleplayNow(now));
  return `${value} JST`;
}

export function hanamiRoleplayMonthDay(now=new Date()){
  const date=hanamiRoleplayNow(now);
  return {month:Number(new Intl.DateTimeFormat("en-US",{month:"numeric",timeZone:HANAMI_TIME_ZONE}).format(date)),day:Number(new Intl.DateTimeFormat("en-US",{day:"numeric",timeZone:HANAMI_TIME_ZONE}).format(date))};
}

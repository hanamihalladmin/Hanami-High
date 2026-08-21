export const HANAMI_ROLEPLAY_YEAR=2006;
export const HANAMI_SCHOOL_YEAR="2006–07";
export const HANAMI_FIRST_DAY_ISO="2006-04-07T12:00:00+09:00";

export function hanamiRoleplayNow(){
  return new Date(HANAMI_FIRST_DAY_ISO);
}

export function hanamiRoleplayDate(){
  return new Intl.DateTimeFormat("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit",hour12:true,timeZone:"Asia/Tokyo",timeZoneName:"short"}).format(hanamiRoleplayNow());
}

export function hanamiRoleplayMonthDay(){
  const date=hanamiRoleplayNow();
  return {month:Number(new Intl.DateTimeFormat("en-US",{month:"numeric",timeZone:"Asia/Tokyo"}).format(date)),day:Number(new Intl.DateTimeFormat("en-US",{day:"numeric",timeZone:"Asia/Tokyo"}).format(date))};
}

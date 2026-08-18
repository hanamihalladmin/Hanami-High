export const HANAMI_ROLEPLAY_YEAR=2006;
export const HANAMI_SCHOOL_YEAR="2006–07";

export function hanamiRoleplayDate(now=new Date()){
  const parts=new Intl.DateTimeFormat("en-CA",{month:"2-digit",day:"2-digit",timeZone:"Asia/Tokyo"}).formatToParts(now);
  const month=parts.find(part=>part.type==="month")?.value??"01";
  const day=parts.find(part=>part.type==="day")?.value??"01";
  const anchored=new Date(`${HANAMI_ROLEPLAY_YEAR}-${month}-${day}T12:00:00+09:00`);
  return new Intl.DateTimeFormat("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric",timeZone:"Asia/Tokyo"}).format(anchored);
}

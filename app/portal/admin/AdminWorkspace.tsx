"use client";

import AdminSchoolStatusManager from "./AdminSchoolStatusManager";
import AdminAnnouncementManager from "./AdminAnnouncementManager";
import AdminEventManager from "./AdminEventManager";
import AdminOfficeRequestManager from "./AdminOfficeRequestManager";
import AdminOpportunityManager from "./AdminOpportunityManager";
import AdminModerationManager from "./AdminModerationManager";
import AdminCharacterDirectory from "./AdminCharacterDirectory";
import AdminAcademicManager from "./AdminAcademicManager";
import AdminGovernancePanel from "./AdminGovernancePanel";
import AdminOperationsExpansionPanel from "./AdminOperationsExpansionPanel";
import AdminSupportTicketManager from "./AdminSupportTicketManager";
import AdminRoleplaySystemsManager from "./AdminRoleplaySystemsManager";
import AdminHallPassManager from "./AdminHallPassManager";
import AdminNarrativeModerationPanel from "./AdminNarrativeModerationPanel";
import AdminStaffAnalyticsPanel from "./AdminStaffAnalyticsPanel";
import AdminContentApprovalPanel from "./AdminContentApprovalPanel";
import AdminRoadmapManager from "./AdminRoadmapManager";
import AdminRoadmapOperationsPanel from "./AdminRoadmapOperationsPanel";
import AdminCompetitionExamManager from "./AdminCompetitionExamManager";
import AdminContinuityArchiveManager from "./AdminContinuityArchiveManager";
import AdminCityTransitManager from "./AdminCityTransitManager";

type Access={site_admin:boolean;content_editor:boolean;moderator:boolean};

export default function AdminWorkspace({accessToken,userId,access,ownerMode=false}:{accessToken:string;userId:string;access:Access;ownerMode?:boolean}){
 const canModerate=access.site_admin||access.moderator;
 const canEditContent=access.site_admin||access.content_editor;
 const hasAdminAccess=access.site_admin||access.content_editor||access.moderator;
 return <>
  {access.site_admin&&<><AdminGovernancePanel accessToken={accessToken} ownerMode={ownerMode}/><AdminOperationsExpansionPanel accessToken={accessToken} userId={userId}/><AdminCompetitionExamManager accessToken={accessToken} userId={userId}/><AdminContinuityArchiveManager accessToken={accessToken} userId={userId}/></>}
  {hasAdminAccess&&<><AdminStaffAnalyticsPanel accessToken={accessToken}/><AdminContentApprovalPanel accessToken={accessToken}/><AdminNarrativeModerationPanel accessToken={accessToken}/><AdminHallPassManager accessToken={accessToken}/></>}
  {(access.site_admin||canModerate)&&<AdminRoleplaySystemsManager accessToken={accessToken} access={access}/>} 
  {canEditContent&&<><AdminRoadmapManager accessToken={accessToken} userId={userId}/><AdminRoadmapOperationsPanel accessToken={accessToken} userId={userId} canModerate={canModerate}/><AdminCityTransitManager accessToken={accessToken}/><AdminSchoolStatusManager accessToken={accessToken} userId={userId} access={access}/><AdminAnnouncementManager accessToken={accessToken} userId={userId} access={access}/><AdminEventManager accessToken={accessToken} userId={userId} access={access}/><AdminOpportunityManager accessToken={accessToken} userId={userId}/><AdminOfficeRequestManager accessToken={accessToken} userId={userId}/></>}
  {canModerate&&<><AdminSupportTicketManager accessToken={accessToken} userId={userId}/><AdminModerationManager accessToken={accessToken} userId={userId} access={access}/><AdminCharacterDirectory accessToken={accessToken}/></>}
  {access.site_admin&&<AdminAcademicManager accessToken={accessToken}/>} 
 </>;
}
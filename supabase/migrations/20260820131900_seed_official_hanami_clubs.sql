begin;

insert into public.campus_activities(kind,name,description,meeting_location,meeting_schedule,is_active)
values
('student_government','Student Council (生徒会)','Iron-fisted governance, crisp armbands, and absolute authority over the halls of Hanami High. Joining requires iron nerves, unyielding resilience, and the sheer guts to stare down delinquents, manage the school budget, and enforce order with zero hesitation.',null,'Daily',true),
('club','Literature Club (文芸部)','Heavy paperbacks, classic prose, and the scratching of pens. A quiet sanctuary for writers, poets, and deep thinkers seeking refuge from hallway chaos.',null,null,true),
('club','English Club (英会話部)','Pronunciation drills, bilingual debates, and pop culture. A low-pressure space where students can practice conversation, share snacks, and chat about everything except grammar.',null,null,true),
('club','Computer & Gaming Club (パソコン部)','Housed in the dimly lit basement lab where monitors hum like angry hornets. Dedicated to coding, hardware tinkering, and highly unauthorized LAN tournaments after hours.','Basement Computer Lab',null,true),
('club','Science Club (科学部)','Smells faintly of sulfur, rubbing alcohol, and ozone. Row upon row of bubbling glassware and crackling circuit boards; members operate in a state of controlled chaos, sometimes conducting high-voltage experiments and chemical reactions that definitely test the limits of school insurance policies.',null,null,true),
('club','Art Club (美術部)','Paint-stained drop cloths, splattered floors, and indie rock from a busted boombox. A haven for creative students to sketch, paint, and design festival murals.',null,null,true),
('club','Drama Club (演劇部)','Theatrical monologues, stage makeup, and dramatic flair under bright stage lights. Members are the main characters of the auditorium, breathing life into scripts and captivating each student with their performance.','Auditorium',null,true),
('club','Occult Club (オカルト研究会) — Unrecognized','Black candles, chalk pentagrams drawn in the old storage closet, and whispers of urban legends. The Student Council officially denies its existence, yet meetings happen anyway.','Old Storage Closet',null,true),
('club','Volleyball Club (バレーボール部)','Sharp communication, blistering serves, and tight-knit teamwork. Practices demand coordination, lightning reflexes, and unwavering court discipline.','Gymnasium',null,true),
('club','Basketball Club (バスケットボール部)','Students often hear squeaking sneakers on polished gym floors. Their coach, Sir Alfred, runs aggressive defensive drills and high-stakes half-court scrimmages where weekly bragging rights are settled.','Gymnasium',null,true),
('club','Track & Field Club (陸上部)','Dust kicked up from the cinder track, heavy breathing, and relentless time trials. If you linger in the hallways too long, you may have to dodge a sprinter training at full tilt.','Athletics Field',null,true);

update public.handbook_sections
set body = concat(
'Extracurricular activities are available to all enrolled students in good standing. Club participation is voluntary, though the Student Council prefers students not loiter in the hallways after the final bell.', chr(10), chr(10),
'GENERAL CLUB RULES', chr(10),
'• Students may belong to one primary club and one secondary club, provided schedules do not conflict.', chr(10),
'• Members are expected to maintain satisfactory academic standing.', chr(10),
'• Excessive disciplinary violations or fighting on school grounds result in temporary suspension from club activities.', chr(10),
'• Club presidents are elected annually by their members.', chr(10),
'• Faculty advisors oversee each club and approve official events to ensure nobody burns the campus down.', chr(10),
'• All clubs participate in the annual School Cultural Festival (文化祭) and Sports Festival (体育祭).', chr(10),
'• Official club uniforms are strictly restricted to commuting, participating in, or returning from official school club activities (bukatsu). Wearing them on random casual days violates school policy.'
), updated_at=now()
where slug='club-policy';

commit;

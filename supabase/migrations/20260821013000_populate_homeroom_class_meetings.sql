delete from section_meetings m
using class_sections cs, academic_courses ac
where m.section_id=cs.id
  and cs.course_id=ac.id
  and cs.section_code in ('A','B','C')
  and ac.code in ('MAT-101','ENG-101','SCI-101','HIS-101','PE-101','ART-101','CST-101');

with wanted(section_code,course_code,weekday,starts_at,ends_at,label) as (
  values
  ('A','MAT-101',1,'08:30'::time,'09:15'::time,'Period 1'),('A','MAT-101',2,'08:30','09:15','Period 1'),('A','MAT-101',3,'08:30','09:15','Period 1'),('A','MAT-101',4,'08:30','09:15','Period 1'),('A','MAT-101',5,'08:30','09:15','Period 1'),
  ('A','ENG-101',1,'09:15','10:00','Period 2'),('A','ENG-101',2,'09:15','10:00','Period 2'),('A','ENG-101',3,'09:15','10:00','Period 2'),('A','ENG-101',4,'09:15','10:00','Period 2'),('A','ENG-101',5,'09:15','10:00','Period 2'),
  ('A','SCI-101',1,'10:20','11:05','Period 3'),('A','SCI-101',2,'10:20','11:05','Period 3'),('A','SCI-101',3,'10:20','11:05','Period 3'),('A','SCI-101',4,'10:20','11:05','Period 3'),('A','SCI-101',5,'10:20','11:05','Period 3'),
  ('A','HIS-101',1,'11:05','11:50','Period 4'),('A','HIS-101',2,'11:05','11:50','Period 4'),('A','HIS-101',3,'11:05','11:50','Period 4'),('A','HIS-101',4,'11:05','11:50','Period 4'),('A','HIS-101',5,'11:05','11:50','Period 4'),
  ('A','PE-101',1,'12:50','13:35','Period 5'),('A','PE-101',3,'12:50','13:35','Period 5'),('A','ART-101',2,'12:50','13:35','Period 5'),('A','CST-101',4,'12:50','13:35','Period 5'),
  ('B','ENG-101',1,'08:30','09:15','Period 1'),('B','ENG-101',2,'08:30','09:15','Period 1'),('B','ENG-101',3,'08:30','09:15','Period 1'),('B','ENG-101',4,'08:30','09:15','Period 1'),('B','ENG-101',5,'08:30','09:15','Period 1'),
  ('B','SCI-101',1,'09:15','10:00','Period 2'),('B','SCI-101',2,'09:15','10:00','Period 2'),('B','SCI-101',3,'09:15','10:00','Period 2'),('B','SCI-101',4,'09:15','10:00','Period 2'),('B','SCI-101',5,'09:15','10:00','Period 2'),
  ('B','HIS-101',1,'10:20','11:05','Period 3'),('B','HIS-101',2,'10:20','11:05','Period 3'),('B','HIS-101',3,'10:20','11:05','Period 3'),('B','HIS-101',4,'10:20','11:05','Period 3'),('B','HIS-101',5,'10:20','11:05','Period 3'),
  ('B','MAT-101',1,'11:05','11:50','Period 4'),('B','MAT-101',2,'11:05','11:50','Period 4'),('B','MAT-101',3,'11:05','11:50','Period 4'),('B','MAT-101',4,'11:05','11:50','Period 4'),('B','MAT-101',5,'11:05','11:50','Period 4'),
  ('B','PE-101',1,'13:35','14:20','Period 6'),('B','PE-101',3,'13:35','14:20','Period 6'),('B','CST-101',2,'13:35','14:20','Period 6'),('B','ART-101',4,'13:35','14:20','Period 6'),
  ('C','SCI-101',1,'08:30','09:15','Period 1'),('C','SCI-101',2,'08:30','09:15','Period 1'),('C','SCI-101',3,'08:30','09:15','Period 1'),('C','SCI-101',4,'08:30','09:15','Period 1'),('C','SCI-101',5,'08:30','09:15','Period 1'),
  ('C','HIS-101',1,'09:15','10:00','Period 2'),('C','HIS-101',2,'09:15','10:00','Period 2'),('C','HIS-101',3,'09:15','10:00','Period 2'),('C','HIS-101',4,'09:15','10:00','Period 2'),('C','HIS-101',5,'09:15','10:00','Period 2'),
  ('C','MAT-101',1,'10:20','11:05','Period 3'),('C','MAT-101',2,'10:20','11:05','Period 3'),('C','MAT-101',3,'10:20','11:05','Period 3'),('C','MAT-101',4,'10:20','11:05','Period 3'),('C','MAT-101',5,'10:20','11:05','Period 3'),
  ('C','ENG-101',1,'11:05','11:50','Period 4'),('C','ENG-101',2,'11:05','11:50','Period 4'),('C','ENG-101',3,'11:05','11:50','Period 4'),('C','ENG-101',4,'11:05','11:50','Period 4'),('C','ENG-101',5,'11:05','11:50','Period 4'),
  ('C','PE-101',1,'12:50','13:35','Period 5'),('C','PE-101',3,'12:50','13:35','Period 5'),('C','CST-101',2,'12:50','13:35','Period 5'),('C','ART-101',4,'12:50','13:35','Period 5')
)
insert into section_meetings(section_id,weekday,starts_at,ends_at,label)
select cs.id,w.weekday,w.starts_at,w.ends_at,w.label
from wanted w
join academic_courses ac on ac.code=w.course_code
join class_sections cs on cs.course_id=ac.id and cs.section_code=w.section_code;

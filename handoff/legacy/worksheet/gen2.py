import json, sys
T = open('template2.html').read()
END = open('endpoint.txt').read().strip() if __import__('os').path.exists('endpoint.txt') else ''
def B(th, en): return {'th': th, 'en': en}
def make(out, accent, cfg):
    s = T.replace('__TITLE__', cfg['title']['th']).replace('__ACCENT__', accent).replace('__ENDPOINT__', END).replace('__CONFIG__', json.dumps(cfg, ensure_ascii=False))
    open(out, 'w').write(s)

y3 = dict(level='Y3', week=1, style='button', rooms=['Y3.1', 'Y3.2', 'Y3.3', 'Y3.4'],
  title=B('กดได้ หรือ หยุดถามผู้ใหญ่?', 'Tap it, or stop and ask?'),
  root=B('สิ่งที่เด้งขึ้นบนจอ', 'Things that pop up on screen'),
  binA=B('✅ กดได้', '✅ OK to tap'), binB=B('✋ หยุด ถามผู้ใหญ่ก่อน', '✋ Stop and ask an adult'),
  signTitle=B('สัญญาณหลอก 3 ข้อ', '3 trick signs'),
  signs=[dict(short=B('🎁 รางวัล/ของฟรี', '🎁 Prize / free stuff'), long=B('🎁 บอกว่าได้รางวัลหรือของฟรี', '🎁 Says you won a prize or something free')),
         dict(short=B('⏰ เร่งให้รีบกด', '⏰ Hurry up!'), long=B('⏰ เร่งให้รีบกด', '⏰ Rushes you to tap quickly')),
         dict(short=B('📥 ขอข้อมูล/ดาวน์โหลด', '📥 Asks for info / download'), long=B('📥 ขอข้อมูลส่วนตัว หรือให้ดาวน์โหลด', '📥 Asks for personal info or tells you to download'))],
  task1=B('<b>ขั้นที่ 1</b> ลากการ์ดไปวางใน Tree Map ว่าสิ่งที่เห็นบนจอ <b>กดได้</b> หรือต้อง <b>หยุด ถามผู้ใหญ่ก่อน</b> (แตะการ์ดแล้วแตะกล่องก็ได้)',
          '<b>Step 1</b> Drag each card into the Tree Map: is it <b>OK to tap</b>, or should you <b>stop and ask an adult</b>? (You can also tap a card, then tap a box.)'),
  task2=B('<b>ขั้นที่ 2</b> การ์ดฝั่ง "หยุด ถามผู้ใหญ่ก่อน" มีสัญญาณหลอกอะไรบ้าง? กดปุ่มใต้การ์ด เลือกได้มากกว่า 1 อัน',
          '<b>Step 2</b> Which trick signs are on each "Stop and ask" card? Tap the buttons under the card. You can choose more than one.'),
  task3=B('<b>ขั้นที่ 3</b> กดการ์ดที่เราลังเลที่สุดบนใบงาน แล้วเขียนเหตุผล',
          '<b>Step 3</b> Tap the card you were least sure about, then write your reason.'),
  think=B('🤔 ถ้าเจอป้ายแบบนี้ที่บ้าน แต่ไม่แน่ใจว่ากดได้ไหม เราควรทำอย่างไร?', '🤔 If you see a pop-up like this at home and you are not sure, what should you do?'),
  cards=[
   dict(id='a1', icon='▶️', text=B('เล่นต่อ', 'Continue'), bin='a', why=B('ปุ่มของเกมที่เรากดเองเพื่อเล่นต่อ', 'A normal game button you press to keep playing.')),
   dict(id='a2', icon='⏸️', text=B('หยุดชั่วคราว', 'Pause'), bin='a', why=B('ปุ่มควบคุมเกมปกติ', 'A normal game control.')),
   dict(id='a3', icon='🏁', text=B('ด่านถัดไป ➜', 'Next level ➜'), bin='a', why=B('ขึ้นหลังเราเล่นผ่านด่าน เป็นปุ่มปกติของเกม', 'It appears after you finish a level. It is part of the game.')),
   dict(id='a4', icon='🔇', text=B('ปิดเสียง', 'Mute'), bin='a', why=B('ปุ่มตั้งค่าเสียง ไม่ได้ขอข้อมูลหรือให้รางวัล', 'A sound setting. It does not ask for anything.')),
   dict(id='a5', icon='🏠', text=B('กลับหน้าหลัก', 'Home'), bin='a', why=B('พากลับไปหน้าแรกของเกม', 'Takes you back to the game menu.')),
   dict(id='a6', icon='🔁', text=B('เล่นอีกครั้ง', 'Play again'), bin='a', why=B('ปุ่มเริ่มด่านใหม่ของเกม', 'A normal button to replay the level.')),
   dict(id='a7', icon='⚙️', text=B('ตั้งค่า', 'Settings'), bin='a', why=B('ปุ่มตั้งค่าของเกม', 'The game’s own settings button.')),
   dict(id='a8', icon='❓', text=B('วิธีเล่น', 'How to play'), bin='a', why=B('บอกวิธีเล่นเกม ไม่ได้ขออะไร', 'Explains the game. It does not ask for anything.')),
   dict(id='b1', icon='🎁', text=B('ยินดีด้วย! คุณได้แท็บเล็ตฟรี กดเลย', 'Congratulations! You won a free tablet. Tap now!'), bin='b', signs=[1], why=B('บอกว่าได้ของฟรีทั้งที่เราไม่ได้ทำอะไร', 'It says you won something free when you did nothing.')),
   dict(id='b2', icon='⏰', text=B('รีบกด! เหลือเวลา 5 วินาที', 'Hurry! Only 5 seconds left!'), bin='b', signs=[2], why=B('เร่งให้รีบกดจนไม่มีเวลาคิด', 'It rushes you so you do not have time to think.')),
   dict(id='b3', icon='📝', text=B('ใส่ชื่อและเบอร์โทร เพื่อรับเพชร', 'Type your name and phone number to get gems'), bin='b', signs=[1, 3], why=B('ขอข้อมูลส่วนตัว และล่อด้วยรางวัล', 'It asks for personal info and uses a prize to tempt you.')),
   dict(id='b4', icon='📥', text=B('ดาวน์โหลดแอปนี้ รับสกินฟรี', 'Download this app to get a free skin'), bin='b', signs=[1, 3], why=B('ให้ดาวน์โหลด และล่อด้วยของฟรี', 'It tells you to download and offers something free.')),
   dict(id='b5', icon='🎡', text=B('หมุนวงล้อ ลุ้นรับมือถือฟรี!', 'Spin the wheel to win a free phone!'), bin='b', signs=[1], why=B('ล่อด้วยรางวัลใหญ่ที่ไม่น่าเป็นจริง', 'It uses a big prize that is too good to be true.')),
   dict(id='b6', icon='⚠️', text=B('เครื่องของคุณติดไวรัส! กดแก้ทันที', 'Your device has a virus! Tap to fix it now!'), bin='b', signs=[2, 3], why=B('ทำให้ตกใจ เร่งให้กด และมักให้ดาวน์โหลดโปรแกรม', 'It scares you, rushes you and usually makes you download something.')),
   dict(id='b7', icon='🔥', text=B('ลดราคา 99% เหลือเวลา 1 ชั่วโมง', '99% off! Only 1 hour left!'), bin='b', signs=[2], why=B('เร่งให้รีบตัดสินใจ', 'It pushes you to decide quickly.')),
   dict(id='b8', icon='🔑', text=B('ใส่รหัสผ่าน รับเหรียญ 1,000 เหรียญ', 'Enter your password to get 1,000 coins'), bin='b', signs=[1, 3], why=B('ขอรหัสผ่านและล่อด้วยรางวัล ห้ามบอกรหัสผ่านใคร', 'It asks for your password and offers a prize. Never share your password.')),
  ])
make('Y3_สัปดาห์1_กดได้หรือหยุดถามผู้ใหญ่.html', '#0284c7', y3)

y4 = dict(level='Y4', week=1, style='chat', rooms=['Y4.1', 'Y4.2', 'Y4.3', 'Y4.4'],
  title=B('ข้อความนี้ ปลอดภัย หรือ อันตราย?', 'Is this message safe or dangerous?'),
  root=B('ข้อความจากคนแปลกหน้าในเกม', 'Messages from strangers in a game'),
  binA=B('🟢 ปลอดภัย', '🟢 Safe'), binB=B('🔴 อันตราย', '🔴 Dangerous'),
  signTitle=B('สัญญาณอันตราย 4 ข้อ', '4 warning signs'),
  signs=[dict(short=B('1 ขอข้อมูล/รหัส', '1 Personal info / password'), long=B('ขอข้อมูลส่วนตัวหรือรหัสผ่าน', 'Asks for personal information or a password')),
         dict(short=B('2 ขอรูป', '2 Asks for photos'), long=B('ขอรูปภาพ', 'Asks for photos or video')),
         dict(short=B('3 ให้ของรางวัล', '3 Gifts / prizes'), long=B('ให้ของขวัญหรือรางวัล', 'Offers gifts or prizes')),
         dict(short=B('4 ให้เก็บเป็นความลับ', '4 Keep it secret'), long=B('บอกให้เก็บเป็นความลับ', 'Tells you to keep it a secret'))],
  task1=B('<b>ขั้นที่ 1</b> ข้อความเหล่านี้มาจาก <b>คนแปลกหน้าในเกม</b> ลากไปวางใน Tree Map ว่า <b>ปลอดภัย</b> หรือ <b>อันตราย</b> (แตะการ์ดแล้วแตะกล่องก็ได้)',
          '<b>Step 1</b> These messages are from <b>strangers in a game</b>. Drag each one into the Tree Map: <b>safe</b> or <b>dangerous</b>? (You can also tap a card, then tap a box.)'),
  task2=B('<b>ขั้นที่ 2</b> การ์ดฝั่ง "อันตราย" มีสัญญาณอันตรายอะไรบ้าง? กดปุ่มใต้การ์ด บางใบมีมากกว่า 1 อัน',
          '<b>Step 2</b> Which warning signs are in each "dangerous" card? Tap the buttons under the card. Some cards have more than one.'),
  task3=B('<b>ขั้นที่ 3</b> กดการ์ดที่เราลังเลที่สุดบนใบงาน แล้วเขียนเหตุผล',
          '<b>Step 3</b> Tap the card you were least sure about, then write your reason.'),
  think=B('🤔 การ์ดฝั่งปลอดภัยก็ยังมาจากคนแปลกหน้า เราควรคุยกับเขาแค่ไหน?', '🤔 The safe messages still come from strangers. How much should we talk to them?'),
  cards=[
   dict(id='a1', who='Ninja_Kid', text=B('GG เล่นดีมาก!', 'GG, you played really well!'), bin='a', why=B('ชมการเล่นเฉย ๆ ไม่ได้ขออะไร', 'Just praise. It does not ask for anything.')),
   dict(id='a2', who='SpeedyCat', text=B('ด่านนี้ต้องกระโดดตอนไฟเขียวนะ', 'In this level, jump when the light turns green.'), bin='a', why=B('บอกวิธีเล่นเกม', 'A tip about the game.')),
   dict(id='a3', who='BlueDragon', text=B('มาช่วยกันป้องกันฐานเร็ว', 'Quick, help us defend the base!'), bin='a', why=B('คุยเรื่องการเล่นในเกม', 'Talking about playing the game.')),
   dict(id='a4', who='Mango_77', text=B('ขอโทษนะที่ชนเมื่อกี้', 'Sorry I bumped into you just now.'), bin='a', why=B('ขอโทษเรื่องในเกม ไม่ได้ขออะไร', 'Saying sorry about the game. Nothing is asked.')),
   dict(id='a5', who='TeamLeo', text=B('ทีมเรามี 3 คนแล้ว ขาดอีก 1', 'Our team has 3 players. We need 1 more.'), bin='a', why=B('ชวนเล่นเป็นทีมในเกม', 'Inviting you to play as a team in the game.')),
   dict(id='a6', who='MapMaker', text=B('รอบหน้าเล่นแผนที่ป่ากันไหม', 'Shall we play the forest map next round?'), bin='a', why=B('ถามเรื่องแผนที่ในเกม', 'A question about the game map.')),
   dict(id='a7', who='Pixel_Pop', text=B('เน็ตกระตุก ขอออกก่อนนะ', 'My internet is lagging. I have to go.'), bin='a', why=B('บอกลาเฉย ๆ', 'Just saying goodbye.')),
   dict(id='a8', who='SkyRunner', text=B('สกินชุดนี้สวยดีนะ', 'Nice skin!'), bin='a', why=B('ชมของในเกม ไม่ได้ขออะไร', 'A compliment about the game. Nothing is asked.')),
   dict(id='b1', who='ProGamer99', text=B('ส่งรหัสผ่านมา เดี๋ยวพี่เติมเพชรให้', 'Send me your password and I will add gems for you.'), bin='b', signs=[1, 3], why=B('ขอรหัสผ่าน และล่อด้วยเพชร', 'Asks for your password and offers gems.')),
   dict(id='b2', who='StarGirl_12', text=B('ถ่ายรูปตัวเองส่งมาหน่อย อยากเห็นหน้า', 'Take a photo of yourself and send it. I want to see your face.'), bin='b', signs=[2], why=B('ขอรูปจากคนที่ไม่เคยเจอตัวจริง', 'Asks for a photo from someone you have never met.')),
   dict(id='b3', who='KingSkin', text=B('พี่มีสกินหายาก จะให้ฟรีเลย', 'I have a rare skin. I will give it to you for free.'), bin='b', signs=[3], why=B('ให้ของฟรีโดยไม่มีเหตุผล มักใช้ล่อให้ไว้ใจ', 'Free gifts for no reason are often used to win your trust.')),
   dict(id='b4', who='NiceBro', text=B('บอกที่อยู่มาสิ เดี๋ยวส่งของขวัญไปให้ อย่าบอกใครนะ', 'Tell me your address and I will send you a gift. Don’t tell anyone.'), bin='b', signs=[1, 3, 4], why=B('ขอที่อยู่ ให้ของขวัญ และให้เก็บเป็นความลับ มีสัญญาณถึง 3 ข้อ', 'Asks for your address, offers a gift and asks for secrecy: 3 signs.')),
   dict(id='b5', who='Buddy_P3', text=B('เราอยู่ ป.3 เหมือนกัน เรียนโรงเรียนไหนเหรอ', 'I’m in Grade 3 too. Which school do you go to?'), bin='b', signs=[1], why=B('ฟังดูเป็นมิตร แต่ชื่อโรงเรียนบอกได้ว่าเราอยู่ที่ไหน และเราไม่รู้ว่าเขาเป็นใครจริง ๆ', 'It sounds friendly, but your school name shows where you are, and you do not know who they really are.')),
   dict(id='b6', who='ChatChat', text=B('ส่งเบอร์โทรมาสิ จะได้คุยกันในแอปอื่น', 'Send me your phone number so we can chat on another app.'), bin='b', signs=[1], why=B('ขอเบอร์โทรและพาไปคุยนอกเกม ที่ไม่มีใครเห็น', 'Asks for your number and moves the chat to a place no one else can see.')),
   dict(id='b7', who='CamCam', text=B('เปิดกล้องคุยกันหน่อย อยากเห็นหน้า', 'Turn on your camera. I want to see you.'), bin='b', signs=[2], why=B('ขอเห็นหน้าเหมือนขอรูป', 'Asking to see you on camera is like asking for photos.')),
   dict(id='b8', who='BestieX', text=B('เราสนิทกันแล้ว ห้ามบอกแม่นะ', 'We are best friends now. Don’t tell your mum.'), bin='b', signs=[4], why=B('ให้เก็บเป็นความลับจากผู้ปกครอง เป็นสัญญาณอันตรายมาก', 'Keeping secrets from your parents is a big warning sign.')),
  ])
make('Y4_สัปดาห์1_ข้อความปลอดภัยหรืออันตราย.html', '#4f46e5', y4)
print('endpoint:', END or '(none)')

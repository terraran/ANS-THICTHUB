# ANS ICT Hub

เว็บรวมใบงานและเกมวิชา ICT ป.3–ป.4 (โรงเรียนอำนวยศิลป์) · นักเรียนเลือกห้อง → ชื่อเล่น → กิจกรรม ไม่ต้อง Login
เป็น static site ล้วน (HTML + JS + JSON) ไม่มีขั้น build · deploy ด้วย GitHub Pages

## โครงไฟล์

| ไฟล์ | หน้าที่ |
|---|---|
| `index.html`, `assets/` | หน้านักเรียน: หน้าแรก / เลือกห้อง / เลือกชื่อ / คลังกิจกรรม |
| `config.js` | URL ของ Apps Script และลิงก์คีย์บอร์ดเควส (ห้ามใส่รหัสครู) |
| `data/levels.json` | ระดับชั้นและห้อง · เพิ่ม Y5–Y6 ได้ที่นี่ |
| `data/activities.json` | การ์ดในคลังกิจกรรม (ใบงาน/เกม) + คำถาม Frame of Reference ของแต่ละใบงาน |
| `worksheet/` | template ใบงานกลาง · เนื้อหาแต่ละใบอยู่ใน `worksheet/content/<id>.json` |
| `games/` | เกม (เล่นเฉย ๆ ไม่เก็บคะแนน) |
| `apps-script/Code.gs` | โค้ดหลังบ้าน วางใน Google Sheet |
| `teacher/` | มุมครู (Phase 3) |
| `tests/` | ทดสอบ (Playwright + ทดสอบ Code.gs ด้วย Sheet จำลอง) |
| `handoff/` | เอกสารสโคป, mock และโค้ดเดิม (อ้างอิง) |

## เพิ่มใบงานใหม่
1. สร้าง `worksheet/content/y3w2.json` (คัดลอกจาก `y3w1.json` แล้วแก้ · `act` ต้องตรงกับชื่อไฟล์)
2. เพิ่มการ์ดใน `data/activities.json` (`id`, `level`, `week`, `kind: "sheet"`, `title`, `path: "worksheet/?act=y3w2"`, `frq`)
3. เปิดให้ห้องเรียนในแท็บ `Unlocks` ของ Sheet

## ตั้งค่าหลังบ้าน (ทำครั้งเดียว)
1. ใน Google Sheet เปลี่ยนชื่อแท็บที่รับงานอยู่เป็น **Submissions**
2. Extensions → Apps Script → วางโค้ดจาก `apps-script/Code.gs` ทับของเดิมทั้งไฟล์ → Save
3. Project Settings (รูปเฟือง) → Script properties → เพิ่ม `TEACHER_KEY` = รหัสครู
4. เลือกฟังก์ชัน `setup` → Run (สร้างแท็บ `Roster` และ `Unlocks`)
5. Deploy → Manage deployments → ✏️ แก้ไข → Version: **New version** → Deploy (URL เดิม)
6. กรอกแท็บ `Roster`: `room | nickname | active | order` เช่น `Y3.2 | ขิม | TRUE | 1` (ชื่อเล่นเท่านั้น · ใส่ FALSE ที่ active เพื่อซ่อน)
7. กรอกแท็บ `Unlocks`: `room | activityId | open` เช่น `Y3 | y3w1 | TRUE` (room ใส่ห้องเดียว `Y3.2`, ทั้งชั้น `Y3` หรือทุกห้อง `*` · ไม่มีแถว = ปิด)

ใบงานไฟล์เก่าและหน้าแชร์ผลงานเดิมยังใช้กับ Script ตัวใหม่ได้

## GitHub Pages
Settings → Pages → Source: Deploy from a branch → `main` / `(root)`

## ทดสอบในเครื่อง
```bash
npm install
```
```bash
npx playwright install chromium
```
```bash
npm test
```
ดูหน้าเว็บในเครื่อง: `npm run serve` แล้วเปิด http://localhost:8080

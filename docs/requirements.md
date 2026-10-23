# Öğrenci Çalışma ve Oyunlaştırma Platformu
## Codex Requirement Analysis / Implementation Specification

**Doküman sürümü:** 1.0  
**Tarih:** 23 Ekim 2026  
**Hedef:** Bu dosya, Codex'in mevcut veya yeni bir repository üzerinde MVP'yi analiz edip uygulayabilmesi için hazırlanmıştır.  
**Ürün tipi:** Responsive Web Application + PWA  
**Birincil kullanıcı:** 7. sınıf öğrenci  
**İkincil kullanıcı:** Ebeveyn / veli  
**MVP odağı:** Günlük çalışma alışkanlığı, ödev takibi, çalışma planı, oyunlaştırma ve ebeveyn gözetimi.

---

# 1. Codex İçin Çalışma Talimatı

Bu dokümanı uygulama geliştirme için **source of truth** olarak kullan.

Kod yazmaya başlamadan önce:

1. Repository yapısını, package manager'ı ve mevcut bağımlılıkları incele.
2. Var olan teknoloji tercihleri bu dokümandaki önerilen stack ile çelişmiyorsa onları koru.
3. Repository boşsa Bölüm 4'teki varsayılan teknik stack'i kullan.
4. Önce veri modeli ve yetkilendirme modelini kur; ardından ekranları geliştir.
5. İş kurallarını yalnızca UI katmanında uygulama; puan, rol ve erişim kontrollerini server/database tarafında da güvence altına al.
6. MVP dışı özellikleri, gerekli altyapı dışında, implement etme.
7. Her ana modül için en az temel happy-path ve kritik edge-case testlerini oluştur.
8. Secret/API key değerlerini repository'ye yazma. `.env.example` oluştur.
9. Veritabanı değişikliklerini migration olarak tut.
10. Demo için seed data oluştur.
11. Her implementasyon aşamasında bu dosyadaki `FR-*`, `BR-*`, `NFR-*` kimliklerini referans al.
12. Belirsiz bir nokta varsa Bölüm 16'daki MVP varsayımlarını kullan; yalnızca ürün davranışını kökten değiştirecek bir engel varsa kullanıcıya soru sor.

**Definition of Done:** Bölüm 15'teki uçtan uca MVP kabul senaryosu çalışmadan proje tamamlanmış sayılmamalıdır.

---

# 2. Ürün Vizyonu

Öğrencinin günlük sorumluluklarını, okul ödevlerini ve düzenli çalışma alışkanlığını tek bir uygulamada yönetmesini sağlamak; çalışma sürecini XP, Coin, seviye, seri ve ödül mekanikleriyle motive edici hale getirmek.

Uzun vadeli davranış hedefi:

> Öğrenciyi “Bana bugün ne yapacağımı söyleyin” yaklaşımından “Bugün ne yapacağımı biliyorum ve kendi planımı yönetebiliyorum” yaklaşımına taşımak.

## 2.1 Temel hedefler

- 7. sınıfta sürdürülebilir bir çalışma rutini oluşturmak.
- 8. sınıf / LGS dönemine kademeli hazırlık sağlamak.
- Ödev, sınav ve çalışma görevlerini tek yerde görünür hale getirmek.
- Çalışmayı yalnızca süre üzerinden değil; görev tamamlama, soru çözme, tekrar ve devamlılık üzerinden takip etmek.
- Öğrencinin planlama ve sorumluluk alma becerisini artırmak.
- Ebeveynin mikro-yönetim yapmadan genel ilerlemeyi görebilmesini sağlamak.
- XP/Coin ve ödül sistemiyle pozitif pekiştirme oluşturmak.

## 2.2 Kapsam dışı

MVP aşağıdakileri içermez:

- Okul yönetim sistemi / öğretmen portalı.
- Resmi not, karne veya okul kaydı yönetimi.
- Başka öğrencilerle liderlik tablosu veya rekabet.
- Yapay zekâ ile ders içeriği üretimi.
- Otomatik LGS soru önerisi veya adaptif öğrenme.
- Yanlış soru havuzu ve konu zayıflık analizi.
- Push notification zorunluluğu.
- Sosyal profil, mesajlaşma veya herkese açık kullanıcı arama.
- Native iOS/Android uygulama.

---

# 3. Kullanıcı Rolleri

## 3.1 Öğrenci

Amaçları:

- Bugün ne yapacağını görmek.
- Ödevlerini takip etmek.
- Çalışma oturumu başlatmak ve tamamlamak.
- Görevleri tamamlamak.
- XP ve Coin kazanmak.
- Coin ile ödül talep etmek.
- Kendi ilerlemesini görmek.
- İzin verilen ölçüde kendi görevini eklemek.

Kısıtlar:

- Ebeveyn tarafından tanımlanan puan kurallarını değiştiremez.
- Coin/XP bakiyesini doğrudan değiştiremez.
- Ödül taleplerini kendi kendine onaylayamaz.
- Başka aile veya öğrenci verisine erişemez.

## 3.2 Ebeveyn

Amaçları:

- Öğrenci için görev/ödev/çalışma planı oluşturmak.
- Ödül kataloğunu yönetmek.
- Haftalık ilerlemeyi görmek.
- Ödül taleplerini onaylamak veya reddetmek.
- Gerekirse Coin/XP düzeltmesi yapmak.
- Sistemin temel kurallarını yapılandırmak.

## 3.3 Sistem

Sorumlulukları:

- Puanları tekil ve tutarlı şekilde hesaplamak.
- Seviye ve seri durumunu güncellemek.
- Geciken ödevleri belirlemek.
- Günlük/haftalık metrikleri hesaplamak.
- Rol bazlı veri erişimini uygulamak.

---

# 4. Önerilen Teknik Stack

Repository boşsa aşağıdaki stack'i kullan:

- **Framework:** Next.js, App Router
- **Language:** TypeScript
- **UI:** React + Tailwind CSS
- **Backend/Data:** Supabase
- **Database:** PostgreSQL
- **Authentication:** Supabase Auth
- **Authorization:** Supabase Row Level Security (RLS) + server-side authorization checks
- **Validation:** Zod veya eşdeğeri schema validation
- **Forms:** React Hook Form veya sade server actions/form actions
- **Date handling:** date-fns veya eşdeğeri
- **Testing:** Vitest/Jest + React Testing Library; mümkünse Playwright ile kritik E2E
- **Hosting target:** Vercel
- **PWA:** Web App Manifest + installable shell; tam offline çalışma MVP zorunluluğu değildir

## 4.1 Mimari prensipler

- Domain kurallarını UI component'lerine gömme.
- XP/Coin hareketleri ledger/transaction tabanlı tutulmalı.
- Bakiye yalnızca tek bir mutable sayı olarak yönetilmemeli; transaction geçmişi audit edilebilir olmalı.
- Kritik yazma işlemleri mümkün olduğunca transaction/atomic operation olmalı.
- Role ve family/student ownership kontrolü server/database katmanında yapılmalı.
- Tarih/saatler DB'de UTC tutulmalı, UI'da yerel saat diliminde gösterilmeli.
- MVP varsayılan saat dilimi: `Europe/Istanbul`.

---

# 5. Ürün Modülleri

| Kod | Modül | Faz |
|---|---|---|
| M01 | Kimlik ve aile hesabı | MVP |
| M02 | Öğrenci ana ekranı | MVP |
| M03 | Günlük görevler ve alışkanlıklar | MVP |
| M04 | Ödev takibi | MVP |
| M05 | Çalışma planı | MVP |
| M06 | Çalışma oturumu | MVP |
| M07 | XP / Coin / Seviye / Seri | MVP |
| M08 | Ödül mağazası | MVP |
| M09 | Takvim | MVP |
| M10 | Ebeveyn paneli ve temel raporlama | MVP |
| M11 | Yanlış soru / konu analizi | Faz 2 |
| M12 | Akıllı çalışma önerileri | Faz 2+ |
| M13 | Push notification / gelişmiş hatırlatma | Faz 2 |

---

# 6. Fonksiyonel Gereksinimler

Öncelikler:

- **Must:** MVP için zorunlu.
- **Should:** MVP değerini yükseltir; zaman kısıtında sonraki iterasyona kalabilir.
- **Could:** MVP sonrasına bırakılabilir.

## 6.1 Kimlik ve kullanıcı yönetimi

### FR-001 — Rol bazlı kullanıcı
**Priority:** Must  
Sistem `student` ve `parent` rollerini desteklemelidir.

**Acceptance Criteria**
- Giriş sonrasında kullanıcı yalnızca kendi rolüne ait ekranları görür.
- Öğrenci ebeveyn-only API/action çağrılarını yapamaz.
- Ebeveyn bağlı olmadığı öğrenciye erişemez.

### FR-002 — Aile ve öğrenci ilişkisi
**Priority:** Must  
Ebeveyn bir öğrenci profiline bağlanmalıdır.

**Acceptance Criteria**
- Öğrenciye ait görev, ödev, plan, cüzdan ve rapor verileri aile/student scope'u ile izole edilir.
- Veri modeli gelecekte birden fazla öğrenci profilini destekleyebilecek yapıda olmalıdır.

### FR-003 — Güvenli oturum
**Priority:** Must

- iPad Safari ve desktop Chrome/Edge üzerinde oturum devam etmelidir.
- Logout erişimi sonlandırmalıdır.
- Auth token/session yönetimi framework/provider best practice'lerine uygun olmalıdır.

---

## 6.2 Öğrenci ana ekranı

### FR-010 — Bugünün görevleri
**Priority:** Must

Ana ekran bugün aktif olan görevleri listelemelidir.

Her kartta en az:

- Başlık
- Tür: `Homework | Study | Habit`
- Ders/kategori (varsa)
- Tamamlanma durumu
- XP kazancı
- Coin kazancı
- Tahmini süre veya hedef (varsa)

### FR-011 — Günlük ilerleme
**Priority:** Must

Günlük ilerleme yüzdesi gösterilmelidir.

MVP formülü:

```text
daily_progress = completed_weight / total_active_weight * 100
```

`weight` değerleri görevde açıkça tutulmalıdır. Varsayılan ağırlık `1`.

### FR-012 — Oyunlaştırma özeti
**Priority:** Must

Ana ekranda:

- Güncel XP
- Coin bakiyesi
- Seviye
- Aktif seri

görünmelidir.

### FR-013 — Görev türleri
**Priority:** Must

Görevler aşağıdaki üç ana kategoride ayrıştırılmalıdır:

- `HOMEWORK`
- `STUDY`
- `HABIT`

---

## 6.3 Görevler ve alışkanlıklar

### FR-020 — Görev oluşturma
**Priority:** Must

Ebeveyn tek seferlik veya tekrarlayan görev oluşturabilmelidir.

Minimum alanlar:

```text
title
category
description?
due_date / active_date
recurrence?
xp_reward
coin_reward
weight
estimated_minutes?
created_by
active
```

### FR-021 — XP ve Coin ayrı tanımlanmalı
**Priority:** Must

Görevde XP ve Coin bağımsız alanlar olmalıdır.

### FR-022 — Öğrencinin kendi görevini eklemesi
**Priority:** Should

Öğrenci kendi çalışma veya alışkanlık görevini ekleyebilir.

MVP güvenlik varsayımı:

- Öğrencinin kendi oluşturduğu görev için `coin_reward = 0`.
- XP varsayılan olarak `5` veya parent-configured bir sınır içinde olabilir.
- Kaynak `STUDENT_CREATED` olarak tutulmalıdır.

### FR-023 — Görev tamamlama
**Priority:** Must

Tamamlama işlemi:

1. Completion kaydı oluşturmalı.
2. XP transaction oluşturmalı.
3. Coin varsa Coin transaction oluşturmalı.
4. Günlük ilerlemeyi güncellenebilir hale getirmeli.
5. Aynı completion için ödül yalnızca bir kez verilmelidir.

### FR-024 — Görev tamamlamayı geri alma
**Priority:** Must

Tamamlama geri alındığında ilgili XP/Coin işlemi güvenli biçimde reverse edilmelidir.

Kurallar:

- Aynı completion iki kez reverse edilemez.
- Coin başka bir ödülde harcanmışsa bakiye negatife düşmemelidir.
- Negatif bakiye riski varsa kullanıcıya geri alma engellenmeli veya parent adjustment flow kullanılmalıdır.

---

## 6.4 Ödev takibi

### FR-030 — Ödev kaydı
**Priority:** Must

Ödev alanları:

```text
subject
title
description?
due_at
estimated_minutes?
priority: LOW | MEDIUM | HIGH
status: OPEN | IN_PROGRESS | COMPLETED
xp_reward
coin_reward
created_by
```

### FR-031 — Ödev filtreleri
**Priority:** Must

Liste filtreleri:

- Bugün
- Yarın
- Bu Hafta
- Geciken
- Tamamlanan

`Geciken = due_at < now AND status != COMPLETED`.

Gecikme otomatik ceza üretmez.

### FR-032 — Ödevi parçalara bölme
**Priority:** Should

Bir ödev birden çok `HomeworkItem` alt görevine bölünebilmelidir.

Örnek:

```text
Ana ödev: Matematik 60 soru
- Pazartesi 20 soru
- Salı 20 soru
- Çarşamba 20 soru
```

Ana ödev tüm zorunlu alt görevler tamamlandığında tamamlandı olarak işaretlenebilir veya kullanıcı tarafından tamamlanabilir.

### FR-033 — Ödev tamamlama ödülü
**Priority:** Must

Ödev tamamlandığında tanımlı XP/Coin tek sefer verilmelidir.

---

## 6.5 Haftalık çalışma planı

### FR-040 — Çalışma blokları
**Priority:** Must

Haftalık planda gün bazlı çalışma blokları bulunmalıdır.

Minimum alanlar:

```text
date
order_index
start_time?
planned_minutes
subject?
topic?
title
linked_homework_id?
linked_task_id?
status
```

Saat zorunlu değildir. `order_index` ile yalnız sıralı plan da desteklenmelidir.

### FR-041 — Görev/ödev bağlantısı
**Priority:** Should

Çalışma bloğu bir ödev veya çalışma görevine bağlanabilir.

### FR-042 — Haftayı kopyalama
**Priority:** Should

Bir haftanın planı sonraki haftaya kopyalanabilir.

### FR-043 — “Bugün ne çalışmalıyım?”
**Priority:** Must

Öğrenci bugünün tamamlanmamış çalışma bloklarını önerilen sırada görmelidir.

---

## 6.6 Çalışma oturumu

### FR-050 — Sayaçlı çalışma
**Priority:** Must

Öğrenci bir çalışma bloğu üzerinden çalışma oturumu başlatabilir.

State machine:

```text
NOT_STARTED -> RUNNING -> PAUSED -> RUNNING -> COMPLETED
                         -> COMPLETED
```

Kaydedilecek minimum veriler:

```text
started_at
ended_at
active_seconds
study_block_id
student_id
```

### FR-051 — Soru sayısı
**Priority:** Should

Oturum bitiminde `questions_solved` isteğe bağlı girilebilir.

### FR-052 — Tamamlama geri bildirimi
**Priority:** Must

Oturum sonunda öğrenciye:

- Çalışma süresi
- Soru sayısı (varsa)
- Kazanılan XP
- Kazanılan Coin

gösterilmelidir.

---

## 6.7 XP / Coin / Seviye / Seri

### FR-060 — XP
**Priority:** Must

XP:

- Kümülatiftir.
- Ödül alırken harcanmaz.
- Seviye hesabında kullanılır.

### FR-061 — Coin
**Priority:** Must

Coin:

- Harcanabilir bakiyedir.
- Kazanç ve harcamalar ledger olarak tutulur.
- Bakiye transaction toplamından hesaplanabilir veya cache'leniyorsa ledger ile tutarlı olmalıdır.

### FR-062 — Seviye
**Priority:** Must

MVP varsayılan seviye eşikleri:

```text
Level 1: 0 XP
Level 2: 100 XP
Level 3: 250 XP
Level 4: 450 XP
Level 5: 700 XP
Level 6: 1000 XP
Level 7+: configurable thresholds
```

Eşikler ileride settings/config tablosundan değiştirilebilir olmalıdır.

### FR-063 — Seri
**Priority:** Must

Bir günün seri için başarılı sayılması:

```text
daily_progress >= 70%
```

Kurallar:

- Bir gün başarısız olmak geçmiş XP'yi silmez.
- Seri yalnızca devamlılık göstergesidir.
- Geçmiş gün sonradan değiştirilirse streak hesaplaması deterministik şekilde yeniden üretilebilir olmalıdır.

### FR-064 — Seri koruyucu
**Priority:** Could — MVP'de implement etme.

### FR-065 — Hafif gün
**Priority:** Should

MVP varsayımı:

- Haftada en fazla 1 hafif gün.
- Öğrenci talep edebilir; parent ayarına göre doğrudan uygulanabilir.
- Hafif günde seri eşiği normal günlük toplam hedefin yaklaşık %50'si olacak şekilde azaltılır.
- Geçmiş görev tanımları değiştirilmez; yalnızca o günün hedef hesabı etkilenir.

---

## 6.8 Ödül mağazası

### FR-070 — Ödül yönetimi
**Priority:** Must

Ebeveyn şu alanlarla ödül tanımlayabilmelidir:

```text
name
description?
coin_cost
active
requires_parent_approval = true
```

### FR-071 — Ödül talebi
**Priority:** Must

Öğrenci yeterli Coin varsa ödül talebi oluşturabilir.

### FR-072 — Onay akışı
**Priority:** Must

Durumlar:

```text
PENDING
APPROVED
REJECTED
CANCELLED
```

### FR-073 — Coin harcama zamanı
**Priority:** Must

MVP kararı:

- Coin talep oluşturulurken düşülmez.
- Ebeveyn `APPROVED` yaptığında atomik olarak düşülür.
- Onay anında bakiye tekrar kontrol edilir.
- Aynı request için Coin yalnız bir kez düşülür.
- Rejected request bakiye değiştirmez.

---

## 6.9 Takvim

### FR-080 — Birleşik takvim
**Priority:** Must

Takvim en az şu olayları göstermelidir:

- Ödev teslimleri
- Sınavlar / akademik etkinlikler
- Çalışma blokları

### FR-081 — Yaklaşan işler
**Priority:** Should

Önümüzdeki 7 gün içindeki ödev/sınavlar öğrenci ana ekranında tarih sırasıyla gösterilebilir.

---

## 6.10 Ebeveyn paneli ve raporlama

### FR-090 — Haftalık özet
**Priority:** Must

Gösterilecek metrikler:

- Görev tamamlama oranı
- Toplam aktif çalışma süresi
- Çözülen soru sayısı
- Aktif seri
- Haftalık kazanılan XP
- Haftalık kazanılan/harcanan Coin

### FR-091 — Yönetim merkezi
**Priority:** Must

Ebeveyn panelinden erişilebilir olmalı:

- Görev yönetimi
- Ödev yönetimi
- Haftalık plan
- Ödüller
- Bekleyen ödül talepleri
- Coin/XP history

### FR-092 — Audit/history
**Priority:** Must

Transaction geçmişinde en az:

```text
timestamp
type
amount
description
source_type
source_id
created_by
```

görülmelidir.

---

# 7. İş Kuralları

### BR-001
XP ve Coin birbirinden bağımsızdır.

### BR-002
Bir tamamlanma kaydı için XP/Coin en fazla bir kez verilebilir. Database seviyesinde unique constraint/idempotency uygulanmalıdır.

### BR-003
Günlük ilerleme yalnız o gün aktif ve hesaba dahil görevlerin ağırlıkları üzerinden hesaplanır.

### BR-004
Temel ihtiyaçlar, yemek, aile ilgisi, zorunlu eğitim erişimi veya benzeri haklar Coin ile kısıtlanan ödül olarak tasarlanmamalıdır.

### BR-005
Seri kaybı XP, Coin veya geçmiş başarıları silmez.

### BR-006
Başka öğrencilerle karşılaştırma veya leaderboard yoktur.

### BR-007
Geciken ödev kendi başına XP/Coin cezası üretmez.

### BR-008
Ebeveyn manuel XP/Coin düzeltmesi yaparsa açıklama/reason zorunlu olmalıdır.

### BR-009
Hafif gün kullanım sayısı ayarlanabilir olmalıdır; MVP varsayılanı haftada 1'dir.

### BR-010
Çalışma oturumunun tamamlanması için minimum aktif süre ayarlanabilir olmalıdır. MVP varsayılanı 5 dakikadır.

### BR-011
Student-created görevler doğrudan Coin üretemez. MVP'de `coin_reward = 0`.

### BR-012
Tüm puan hareketleri source entity ile ilişkilendirilmelidir.

### BR-013
Para/puan hesabında client tarafından gönderilen reward değeri güvenilmez kabul edilmelidir. Server, gerçek reward değerini DB'den okumalıdır.

### BR-014
Parent'ın öğrenci verisi üzerinde yaptığı kritik değişiklikler için `updated_at` ve mümkünse actor bilgisi saklanmalıdır.

---

# 8. Bilgi Mimarisi ve Ekranlar

## S01 — Öğrenci Ana Sayfa

İçerik:

- Tarih ve kısa selamlama
- Günlük ilerleme
- XP / Level
- Coin
- Streak
- Bugünün görevleri
- Bugünün çalışma planı
- Yaklaşan işler (Should)

Primary CTA:

- Görevi tamamla
- Çalışmaya başla

## S02 — Görevler

Sekmeler/filtreler:

- Tümü
- Ödev
- Çalışma
- Alışkanlık
- Tamamlanan

## S03 — Ödevler

Filtreler:

- Bugün
- Yarın
- Bu hafta
- Geciken
- Tamamlanan

Detay ekranında alt görevler gösterilmelidir.

## S04 — Haftalık Plan

- Pazartesi–Pazar görünümü
- Gün içi sıralı study blocks
- MVP'de drag/drop zorunlu değildir
- Add/Edit/Delete block

## S05 — Çalışma Oturumu

- Başlık
- Ders/konu
- Timer
- Pause/Resume
- Finish
- Soru sayısı girişi
- Completion summary

## S06 — Takvim

- Ay veya hafta görünümü
- Ödev / sınav / çalışma planı ayırt edilebilir
- Durum yalnız renge bağlı olmamalıdır; ikon/label kullan

## S07 — Ödül Mağazası

- Coin balance
- Reward cards
- Coin cost
- Request button
- Pending/approved/rejected history

## S08 — Profil / Başarı

MVP minimum:

- Level
- Total XP
- Current streak
- Longest streak

Rozet sistemi MVP dışı bırakılabilir.

## S09 — Ebeveyn Dashboard

- Weekly summary cards
- Pending reward requests
- Upcoming homework/exams
- Quick add buttons
- Recent XP/Coin activity

## S10 — Ebeveyn Yönetim

- Tasks
- Homework
- Study plan
- Rewards
- Settings
- XP/Coin adjustment

---

# 9. Veri Modeli

Aşağıdaki şema kavramsal + fiziksel tasarım için başlangıç noktasıdır. Codex migration üretirken naming convention'ı tutarlı seçmelidir.

## 9.1 `families`

```text
id UUID PK
name TEXT nullable
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

## 9.2 `profiles`

```text
id UUID PK -> auth.users.id
family_id UUID FK families
role ENUM('PARENT','STUDENT')
display_name TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

## 9.3 `student_profiles`

```text
id UUID PK
user_id UUID UNIQUE FK profiles
family_id UUID FK families
current_grade INT default 7
timezone TEXT default 'Europe/Istanbul'
created_at
updated_at
```

## 9.4 `tasks`

```text
id UUID PK
student_id UUID FK student_profiles
created_by UUID FK profiles
category ENUM('HOMEWORK','STUDY','HABIT')
source ENUM('PARENT_CREATED','STUDENT_CREATED','SYSTEM')
title TEXT
description TEXT nullable
active_date DATE nullable
due_at TIMESTAMPTZ nullable
recurrence_rule TEXT nullable
estimated_minutes INT nullable
weight NUMERIC default 1
xp_reward INT default 0
coin_reward INT default 0
active BOOLEAN default true
created_at
updated_at
```

## 9.5 `task_completions`

```text
id UUID PK
task_id UUID FK tasks
student_id UUID FK student_profiles
completed_at TIMESTAMPTZ
completed_by UUID FK profiles
reversed_at TIMESTAMPTZ nullable
created_at

UNIQUE(task_id, student_id, completion_occurrence_key)
```

Tekrarlayan görevlerde `completion_occurrence_key` ör. `YYYY-MM-DD` olabilir.

## 9.6 `homework`

```text
id UUID PK
student_id UUID
created_by UUID
subject TEXT
title TEXT
description TEXT nullable
due_at TIMESTAMPTZ
estimated_minutes INT nullable
priority ENUM('LOW','MEDIUM','HIGH')
status ENUM('OPEN','IN_PROGRESS','COMPLETED')
xp_reward INT default 0
coin_reward INT default 0
completed_at TIMESTAMPTZ nullable
created_at
updated_at
```

## 9.7 `homework_items`

```text
id UUID PK
homework_id UUID FK homework
title TEXT
planned_date DATE nullable
order_index INT
completed_at TIMESTAMPTZ nullable
created_at
updated_at
```

## 9.8 `study_plans`

```text
id UUID PK
student_id UUID
week_start DATE
created_by UUID
created_at
updated_at

UNIQUE(student_id, week_start)
```

## 9.9 `study_blocks`

```text
id UUID PK
study_plan_id UUID
student_id UUID
date DATE
order_index INT
start_time TIME nullable
planned_minutes INT
title TEXT
subject TEXT nullable
topic TEXT nullable
linked_homework_id UUID nullable
linked_task_id UUID nullable
status ENUM('PLANNED','IN_PROGRESS','COMPLETED','SKIPPED')
xp_reward INT default 0
coin_reward INT default 0
created_at
updated_at
```

## 9.10 `study_sessions`

```text
id UUID PK
student_id UUID
study_block_id UUID nullable
started_at TIMESTAMPTZ
ended_at TIMESTAMPTZ nullable
active_seconds INT default 0
questions_solved INT nullable
status ENUM('RUNNING','PAUSED','COMPLETED','CANCELLED')
created_at
updated_at
```

## 9.11 `xp_transactions`

```text
id UUID PK
student_id UUID
amount INT
transaction_type ENUM('EARN','ADJUSTMENT','REVERSAL')
source_type TEXT
source_id UUID nullable
description TEXT
created_by UUID nullable
created_at TIMESTAMPTZ

UNIQUE(student_id, source_type, source_id, transaction_type) where applicable
```

## 9.12 `coin_transactions`

```text
id UUID PK
student_id UUID
amount INT
transaction_type ENUM('EARN','SPEND','ADJUSTMENT','REVERSAL')
source_type TEXT
source_id UUID nullable
description TEXT
created_by UUID nullable
created_at TIMESTAMPTZ
```

## 9.13 `rewards`

```text
id UUID PK
family_id UUID
name TEXT
description TEXT nullable
coin_cost INT CHECK > 0
active BOOLEAN default true
requires_parent_approval BOOLEAN default true
created_by UUID
created_at
updated_at
```

## 9.14 `reward_requests`

```text
id UUID PK
reward_id UUID
student_id UUID
coin_cost_snapshot INT
status ENUM('PENDING','APPROVED','REJECTED','CANCELLED')
requested_at TIMESTAMPTZ
reviewed_at TIMESTAMPTZ nullable
reviewed_by UUID nullable
coin_transaction_id UUID nullable
created_at
updated_at
```

`coin_cost_snapshot` zorunludur; ödül bedeli sonradan değişirse geçmiş request etkilenmemelidir.

## 9.15 `calendar_events`

```text
id UUID PK
student_id UUID
created_by UUID
type ENUM('EXAM','OTHER')
title TEXT
description TEXT nullable
starts_at TIMESTAMPTZ
ends_at TIMESTAMPTZ nullable
created_at
updated_at
```

## 9.16 `daily_status`

Seri ve günlük ilerlemeyi deterministik/audit edilebilir tutmak için önerilir.

```text
id UUID PK
student_id UUID
date DATE
total_weight NUMERIC
completed_weight NUMERIC
progress_percent NUMERIC
light_day BOOLEAN default false
streak_qualified BOOLEAN
calculated_at TIMESTAMPTZ

UNIQUE(student_id, date)
```

## 9.17 `settings`

```text
id UUID PK
family_id UUID
student_id UUID nullable
streak_threshold_percent INT default 70
light_day_threshold_percent INT default 50
max_light_days_per_week INT default 1
minimum_study_session_seconds INT default 300
student_created_task_xp INT default 5
created_at
updated_at
```

---

# 10. Yetkilendirme / RLS Gereksinimleri

Aşağıdaki kurallar database seviyesinde uygulanmalıdır.

1. Parent yalnız kendi `family_id` kapsamındaki verilere erişebilir.
2. Student yalnız kendi `student_id` verilerini okuyabilir.
3. Student parent-only tabloları/alanları değiştiremez.
4. Student kendi task completion ve izin verilen self-created task kayıtlarını yazabilir.
5. Student XP/Coin transaction tablosuna doğrudan arbitrary insert yapamaz.
6. Reward approval yalnız Parent rolü tarafından yapılabilir.
7. Parent manual adjustment yapabilir ancak reason zorunludur.
8. Server action/API, auth kullanıcısını payload içindeki `user_id` değerine güvenmeden session'dan belirlemelidir.

---

# 11. Kritik Domain Servisleri

Codex, aşağıdaki işlemleri reusable domain/service fonksiyonları olarak tasarlamalıdır.

## 11.1 `completeTask(taskId, occurrenceKey)`

Atomic davranış:

1. Auth/ownership kontrolü.
2. Duplicate completion kontrolü.
3. Completion insert.
4. Task reward değerini DB'den oku.
5. XP transaction insert.
6. Coin > 0 ise Coin transaction insert.
7. Daily status recalculation trigger/service.

## 11.2 `reverseTaskCompletion(completionId)`

- Completion reversible mı kontrol et.
- İlgili transaction'ları reverse et.
- Negatif Coin oluşmasını engelle.
- Daily status yeniden hesapla.

## 11.3 `requestReward(rewardId)`

- Reward active mı?
- Student owner mı?
- Current Coin balance yeterli mi?
- `PENDING` request oluştur.
- Bu aşamada Coin harcama.

## 11.4 `approveRewardRequest(requestId)`

Atomic:

1. Parent role + family ownership.
2. Request `PENDING` olmalı.
3. Coin balance yeniden kontrol edilmeli.
4. `SPEND` Coin transaction oluştur.
5. Request `APPROVED` yap.
6. Transaction ID request'e bağlanmalı.

Double-submit idempotent olmalıdır.

## 11.5 `calculateDailyStatus(studentId, date)`

- Aktif task occurrence'larını getir.
- Light-day rule uygula.
- Weight toplamlarını hesapla.
- `progress_percent` üret.
- `streak_qualified` hesapla.
- `daily_status` upsert et.

## 11.6 `calculateStreak(studentId)`

- Daily status üzerinden geriye doğru ardışık `streak_qualified` gün say.
- Current ve longest streak üret.
- Geçmişe dönük değişikliklerde yeniden hesaplanabilir olmalı.

## 11.7 `getWalletBalance(studentId)`

```text
SUM(coin_transactions.amount)
```

SPEND transaction amount negatif tutulabilir. Yaklaşım bir kez seçilmeli ve her yerde aynı kullanılmalıdır.

---

# 12. UX / UI Gereksinimleri

## 12.1 Genel

- Tablet-first responsive tasarım.
- iPad Safari'de dokunmatik alanlar rahat kullanılmalı.
- Desktop'ta gereksiz genişlemeyen merkezi layout.
- Öğrenci ekranı canlı ama çocukça olmayan görsel dil kullanmalı.
- Ebeveyn ekranı daha bilgi yoğun olabilir.

## 12.2 Öğrenci ana ekranı

İlk 5 saniyede üç soru cevaplanmalı:

1. Bugün ne yapacağım?
2. Ne kadarını tamamladım?
3. Ne kazandım?

## 12.3 Geri bildirim

Görev tamamlandığında küçük bir başarı feedback'i:

```text
Tamamlandı! +20 XP / +10 Coin
```

Animasyonlar kısa ve kapatılabilir/rahatsız etmeyecek düzeyde olmalıdır.

## 12.4 Erişilebilirlik

- Sadece renk ile durum anlatma.
- Minimum uygun contrast.
- Buton/touch target'lar tablet kullanımına uygun.
- Form error mesajları açık.
- Klavye ile temel navigasyon çalışmalı.

---

# 13. Non-Functional Requirements

### NFR-001 — Browser support — Must
Güncel iPadOS Safari, Chrome ve Edge.

### NFR-002 — Responsive — Must
Tablet ve desktop ana hedef; mobile görünüm kırılmamalı.

### NFR-003 — PWA — Should
Installable manifest ve icon setup olmalı. Offline-first veri senkronizasyonu MVP zorunluluğu değildir.

### NFR-004 — Performance — Should
Normal ev internetinde ana ekranın kritik içeriği hedef olarak yaklaşık 2 saniye içinde kullanılabilir hale gelmelidir.

### NFR-005 — Security — Must
HTTPS, RLS, server authorization, input validation.

### NFR-006 — Privacy — Must
Minimum veri ilkesi. Adres, konum, okul adı, gereksiz doğum tarihi gibi bilgiler MVP'de toplanmamalı.

### NFR-007 — Backup — Should
Supabase/Postgres backup/PITR imkanına uygun yapılandırma.

### NFR-008 — Accessibility — Should
Temel WCAG yaklaşımı, keyboard focus, contrast, non-color status indicators.

### NFR-009 — Auditability — Must
XP/Coin adjustment ve reward approval geçmişi izlenebilir.

### NFR-010 — Maintainability — Should
Reward thresholds, streak settings ve limits mümkün olduğunca config/data üzerinden yönetilmeli.

### NFR-011 — Data integrity — Must
Puan/ödül işlemlerinde double-submit ve duplicate reward önlenmelidir.

### NFR-012 — Error handling — Must
Kullanıcıya teknik stack trace gösterilmemeli. Beklenen domain hataları anlamlı mesajlarla gösterilmeli.

---

# 14. Seed / Demo Verisi

Development seed aşağıdakileri oluşturmalıdır.

## Demo öğrenci

```text
Display name: Zeynep
Grade: 7
Timezone: Europe/Istanbul
```

## Demo görevleri

```text
Matematik - 20 soru
category: STUDY
xp: 20
coin: 10
weight: 2

20 dk kitap oku
category: HABIT
xp: 10
coin: 5
weight: 1

Çantayı hazırla
category: HABIT
xp: 5
coin: 2
weight: 1
```

## Demo ödev

```text
Subject: Fen Bilimleri
Title: Çalışma kağıdını tamamla
Priority: MEDIUM
XP: 15
Coin: 5
```

## Demo ödüller

```text
+30 dk oyun -> 40 Coin
Film seçme hakkı -> 60 Coin
Hafta sonu yemeğini seçme -> 80 Coin
```

Seed değerleri yalnız development/demo içindir.

---

# 15. MVP Uçtan Uca Kabul Senaryosu

MVP ancak aşağıdaki senaryo eksiksiz çalışıyorsa kabul edilir.

## Scenario A — Parent setup

1. Parent login olur.
2. Student profile görünür.
3. Parent bir `STUDY`, bir `HOMEWORK`, bir `HABIT` öğesi oluşturur.
4. Her birine XP/Coin tanımlar.
5. Haftalık plana en az iki StudyBlock ekler.
6. Bir reward oluşturur.

**Expected:** Tüm kayıtlar öğrenciye doğru scope ile bağlıdır.

## Scenario B — Student daily flow

1. Student iPad/desktop üzerinden login olur.
2. Bugünkü görevleri üç kategori ile görür.
3. StudyBlock içinden timer başlatır.
4. En az 5 dakika geçerli çalışma oturumu tamamlar.
5. Soru sayısını girer.
6. Bir task tamamlar.

**Expected:**

- Completion oluşur.
- XP bir kez artar.
- Coin bir kez artar.
- Daily progress güncellenir.
- Level gerekiyorsa güncellenir.
- Streak qualification hesaplanır.

## Scenario C — Reward flow

1. Student yeterli Coin ile reward request oluşturur.
2. Coin henüz düşmez.
3. Parent request'i görür.
4. Parent approve eder.

**Expected:**

- Coin yalnızca approval anında bir kez düşer.
- Request status `APPROVED` olur.
- Coin transaction history'de görünür.
- Aynı request yeniden approve edilirse ikinci harcama oluşmaz.

## Scenario D — Homework & calendar

1. Parent/student due date içeren homework oluşturur.
2. Homework doğru filtrede görünür.
3. Calendar'da doğru tarihte görünür.
4. Due date geçip tamamlanmazsa `Geciken` olur.
5. Geciktiği için otomatik XP/Coin cezası uygulanmaz.

## Scenario E — Parent report

Parent haftalık dashboard'da aynı tarih aralığı için:

- Completion rate
- Study minutes
- Questions solved
- Current streak
- XP/Coin activity

görür.

---

# 16. MVP İçin Karara Bağlanmış Varsayımlar

Codex aşağıdaki varsayımları ayrıca soru sormadan kullanabilir.

1. **Görev tamamlaması:** Parent-created normal görevlerde student completion doğrudan geçerlidir.
2. **Student-created görev:** Coin kazandırmaz; default 5 XP.
3. **Coin harcama:** Reward request anında değil, parent approval anında düşer.
4. **Daily progress:** Task ağırlıkları üzerinden hesaplanır; default weight=1.
5. **Streak threshold:** %70 günlük ilerleme.
6. **Light day:** Haftada en fazla 1; threshold yaklaşık %50.
7. **Study plan:** Saat opsiyoneldir; sıralı görev desteği zorunludur.
8. **Multiple students:** DB modeli destekler; ilk UX tek öğrenci odaklıdır.
9. **Push notification:** MVP dışıdır.
10. **Badges:** MVP dışıdır; profil ekranı yalnız Level/XP/Streak gösterebilir.
11. **AI suggestions:** MVP dışıdır.
12. **Question analytics:** MVP dışıdır; yalnız `questions_solved` sayısal toplamı tutulur.
13. **Timezone:** Europe/Istanbul.
14. **Language:** İlk sürüm Türkçe; UI text'leri ileride i18n yapılabilecek şekilde merkezi tutulması tercih edilir.

---

# 17. Test Gereksinimleri

En az aşağıdaki testler oluşturulmalıdır.

## Unit/domain tests

- Daily progress calculation.
- Streak threshold calculation.
- XP level calculation.
- Coin balance calculation.
- Reward approval idempotency.
- Duplicate task completion protection.
- Homework overdue calculation.
- Light-day threshold calculation.

## Authorization tests

- Student başka student verisini okuyamaz.
- Student Coin transaction insert edemez.
- Student reward approve edemez.
- Parent başka family verisini okuyamaz.

## Integration/E2E minimum

1. Parent creates task -> Student sees task -> Student completes -> XP/Coin updates.
2. Student requests reward -> Parent approves -> Coin decreases once.
3. Study session starts/pauses/resumes/completes -> active time persists.
4. Homework due date -> calendar + overdue filter.

---

# 18. Önerilen Uygulama Geliştirme Sırası

Codex mümkünse şu sırayla ilerlemelidir:

## Iteration 1 — Foundation

- Next.js/TypeScript setup
- Supabase client/server configuration
- Auth
- Families/profiles/student profile
- RLS skeleton
- Global layout/navigation
- `.env.example`

## Iteration 2 — Tasks + Gamification Ledger

- Tasks
- Task completions
- XP transactions
- Coin transactions
- Balance + level service
- Student dashboard first version

## Iteration 3 — Homework + Calendar

- Homework CRUD
- Filters
- Homework items
- Unified calendar data layer

## Iteration 4 — Study Plan + Session

- Weekly plan
- Study blocks
- Timer/session persistence
- Question count

## Iteration 5 — Rewards

- Reward CRUD
- Student store
- Request flow
- Parent approval
- Idempotent spend transaction

## Iteration 6 — Parent Dashboard + Reports

- Weekly aggregates
- Pending requests
- Recent activity
- Adjustment flow

## Iteration 7 — PWA + Hardening

- Manifest/icons
- Responsive tablet QA
- Accessibility pass
- Error states
- Tests
- Seed/demo setup
- README setup/run instructions

---

# 19. Repository Çıktıları

Codex tamamladığında repository'de en az aşağıdakiler bulunmalıdır:

```text
README.md
.env.example
package.json
src/ or app/
components/
lib/
  auth/
  domain/
  db/
  validation/
supabase/
  migrations/
  seed.sql (veya eşdeğeri)
tests/
public/manifest assets
```

README minimum:

- Proje amacı
- Gereksinimler
- Local setup
- Environment variables
- Supabase setup
- Migration çalıştırma
- Seed çalıştırma
- Dev server
- Test çalıştırma
- Deploy notları

---

# 20. UI Durumları

Her veri ekranında aşağıdaki durumları ele al:

- Loading
- Empty
- Success
- Validation error
- Permission denied
- Network/server failure

Örnek empty state:

> Bugün için henüz görev yok. Planına yeni bir görev ekleyebilirsin.

Teknik hata detaylarını son kullanıcıya gösterme.

---

# 21. Güvenlik ve Çocuk Verisi İlkeleri

- Gereksiz kişisel bilgi toplama.
- Public profile oluşturma.
- Leaderboard oluşturma.
- Çocuk verisini üçüncü taraf analytics'e varsayılan olarak göndermeme.
- Kullanıcı aktivitelerini reklam amacıyla kullanma.
- Sensitive bilgileri log'lama.
- Server-side authorization bypass etmeme.
- Parent'ın öğrenci verisini silebileceği geleceğe dönük bir yapı bırak.

MVP'de analytics gerekiyorsa privacy-preserving, minimum olay seti kullanılmalıdır.

---

# 22. Faz 2 Backlog — Şimdilik Implement Etme

Aşağıdakileri yalnız mimariyi engellemeyecek kadar hesaba kat, fakat MVP içinde geliştirme:

- Doğru / yanlış / boş takibi
- Konu bazlı zayıflık analizi
- Yanlış soru havuzu
- Deneme sınavı takibi
- Akıllı çalışma önerileri
- Yaklaşan sınava göre otomatik plan üretimi
- Adaptive targets
- Badge/achievement engine
- Streak protector
- Push notifications
- Google/Apple calendar integrations
- Multi-parent advanced permissions
- Teacher role

---

# 23. Codex İçin Son Kontrol Listesi

Kod tesliminden önce aşağıdakileri doğrula:

- [ ] Auth ve role separation çalışıyor.
- [ ] RLS uygulanmış ve test edilmiş.
- [ ] Parent/student aynı family scope içinde.
- [ ] Task completion duplicate reward üretemiyor.
- [ ] XP harcanmıyor.
- [ ] Coin ledger üzerinden hesaplanıyor.
- [ ] Reward approval double-spend üretemiyor.
- [ ] Student-created task Coin üretmiyor.
- [ ] Daily progress weight bazlı.
- [ ] Streak %70 threshold ile hesaplanıyor.
- [ ] Homework overdue doğru hesaplanıyor.
- [ ] Study timer pause/resume sonrası aktif süreyi doğru tutuyor.
- [ ] Parent weekly metrics aynı tarih aralığını kullanıyor.
- [ ] iPad Safari layout kullanılabilir.
- [ ] Desktop Chrome/Edge kullanılabilir.
- [ ] Secrets repository'de yok.
- [ ] `.env.example` mevcut.
- [ ] Migrations mevcut.
- [ ] Seed/demo data mevcut.
- [ ] Kritik domain testleri mevcut.
- [ ] README setup adımları çalışıyor.
- [ ] Bölüm 15 uçtan uca senaryoları geçiyor.

---

# 24. Codex'e Verilecek Kısa Başlangıç Prompt'u

Bu requirement dosyası Codex'e repository ile birlikte verildiğinde aşağıdaki komut/prompt kullanılabilir:

```text
Bu repository'de CODEX_REQUIREMENTS_Ogrenci_Calisma_Oyunlastirma_v1.0.md dosyasını source of truth kabul et.
Önce repository'yi analiz et ve gereksinimlerle arasındaki gap'leri çıkar.
Ardından MVP'yi dokümandaki geliştirme sırasına göre uygula.
Mevcut çalışan kodu gereksiz yere yeniden yazma.
FR, BR ve NFR maddelerini takip et.
MVP dışındaki Faz 2 özelliklerini implement etme.
Database migration, RLS, seed data, testler, .env.example ve README dahil eksiksiz çalışan bir sürüm oluştur.
Bir ürün kararı açıkça belirtilmemişse Bölüm 16'daki varsayımları kullan.
İşi tamamlamadan önce Bölüm 15 ve Bölüm 23 kontrol listesini doğrula.
```

---

# 25. Başarı Ölçütleri

Ürünün gerçek kullanımdaki başarısını değerlendirmek için ileride aşağıdaki metrikler izlenebilir:

- Haftalık aktif kullanım günü
- Tamamlanan / planlanan görev oranı
- Geciken ödev sayısı
- Haftalık çalışma süresi
- Haftalık çözülen soru sayısı
- Öğrencinin kendi oluşturduğu görev oranı
- Kazanılan / harcanan Coin dengesi
- Streak sürekliliği

Bu metrikler öğrenciyi başka öğrencilerle kıyaslamak için kullanılmamalıdır.

---

**END OF REQUIREMENTS**

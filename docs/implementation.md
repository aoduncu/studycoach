# Kapsam ve doğrulama

Referans: `requirements.md` v1.0. Bu ilk web sürümü, mobil uygulamanın daha sonra aynı Supabase modeli ve RPC işlemlerini kullanabileceği şekilde hazırlanmıştır. Native mobil bu teslimatta yoktur.

| Gereksinim                  | Uygulama                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------- |
| FR-001–003, BR-013, NFR-005 | Supabase Auth, SSR cookie refresh, davet, RLS, RPC yetki kontrolü                                       |
| FR-010–024, BR-001–003/011  | Üç görev kategorisi, ağırlıklı ilerleme, günlük tekrar, kaynak bazlı ledger, atomik tamamlama/geri alma |
| FR-030/031/033              | Canonical HOMEWORK görevleri, tarih/öncelik, filtre, tek sefer ödül                                     |
| FR-040/043/050–052, BR-010  | Tarih/sıra/saat opsiyonlu bloklar, sunucu aktif süresi, pause/resume ve en az 300 saniye                |
| FR-060–063/065              | XP seviyeleri, Coin toplamı, yeniden hesaplanan gün/seri, haftalık hafif gün                            |
| FR-070–073, BR-008/012      | Ödül kataloğu/talebi/onayı, fiyat snapshot, onayda atomik harcama, açıklamalı düzeltme                  |
| FR-080/081/090–092          | Haftalık takvim, yaklaşan işler, haftalık metrikler, hareket geçmişi                                    |
| NFR-002/003/006/009/011/012 | Responsive/PWA, minimum veri, audit, duplicate koruması, anlaşılır hata                                 |

## Bilinçli sınırlar

- Should özellikler: ödev alt görevleri (FR-032), haftayı kopyalama (FR-042) sonraki iterasyonda; temel akış için gerekli değiller.
- HOMEWORK, task tablosunda tutulur; `homework` güvenli view'ı vardır. Ayrı `homework_items`, `study_plans`, `daily_status` tabloları henüz yoktur. Planlar tarih aralığıyla, günlük durum kayıtlardan türetilir.
- MVP seviyeleri 1–6; seviye 7+ için eşik yapılandırma ekranı yoktur.
- Tekrarlama şu anda günlük veya tek seferliktir; keyfi RRULE yoktur.
- Aktif çalışma session'ı sayfa yenilenince korunur; cihaz kapandığında RUNNING geçen süre devam eder. Otomatik pasiflik takibi yoktur.
- Ödev/görev başlığı ve puanları düzenlenebilir; teslim tarihi/ağırlık değişiklikleri için yeni görev oluşturulur. Tamamlanmış oturumlar audit için silinmez.
- Seriye bugün uygun değilse bugünkü ekranın mevcut seri sayısı sıfır olabilir; gün içi gösterim semantiği ürün değerlendirmesinde netleştirilebilir.
- Gerçek iPad Safari ve Edge, üretim HTTPS, SMTP, Vercel dağıtımı, Supabase backup/PITR ve yeni görevde snapshot restorasyonu burada doğrulanmadı.
- Bulut yayını ortam ayarlarından kullanıcı tarafından yapılır; Git push ve taslak kaydı uygulama dağıtımı değildir.

## Kabul senaryosu kanıtları

A/E: Browser ebeveyn görev oluşturma ve rapor ekranı; entegrasyon testlerinde ebeveyn/öğrenci aile bağlantısı, görev/blok/ödül oluşturma.
B: Browser tamamlama + yenileme ve pause/resume; entegrasyonda gerçek 5 dakikalık session, soru sayısı ve tek seferlik ledger.
C: Gerçek API testinde talepte bakiye sabit, parent onayında snapshot bedeliyle tek harcama, student onayı reddi.
D: API testinde tarihli/geciken homework ve calendar event erişimi, gecikme cezası yok; browser takvim ekranı.

Bu eşleme tam manuel cihaz kabulünün yerini tutmaz. Test sonuçları teslim raporunda ayrı belirtilir.

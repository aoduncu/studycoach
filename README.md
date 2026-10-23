# Studycoach

7. sınıf öğrencileri ve aileleri için Türkçe, tablet öncelikli çalışma platformu. İlk hedef responsive web/PWA; native mobil ayrı bir sonraki fazdır. Kapsam: [gereksinim belgesi](docs/requirements.md).

## Çalışan özellikler

- E-posta/parola oturumu; ebeveynin oluşturduğu öğrenciye tek kullanımlık davetle bağlantı.
- Aile/öğrenci kapsamlı RLS; tüm yazmalarda oturumdan türetilen yetkilendirme.
- Tek seferlik/günlük görevler, ödevler, ağırlıklı ilerleme, tamamlama ve güvenli geri alma.
- Ayrı XP/Coin ledger, seviye, günlük seri ve haftalık hafif gün.
- Haftalık sıralı çalışma planı; sunucu saatine dayanan kalıcı duraklat/devam et sayacı ve soru sayısı.
- Ebeveyn onayında atomik Coin harcayan ödüller, fiyat snapshot'ı ve hareket geçmişi.
- Haftalık birleşik takvim, ebeveyn raporu, açıklama zorunlu puan düzeltmesi ve aile ayarları.
- PWA manifest, PNG simgeler ve kişisel veriyi cache'lemeyen çevrimdışı bilgi ekranı.

Ödevler `HOMEWORK` kategorili canonical görevlerdir; SQL `homework` view'ı aynı veriyi sunar. XP/Coin için ortak `transactions` tablosu, ayrı güvenli view'lar kullanılır. Plan haftası blok tarihinden türetilir. Günlük durum ve seri ledger/completion kayıtlarından hesaplanır; ayrı mutable bakiye yoktur. [Kapsam ve doğrulama notları](docs/implementation.md).

## Gereksinimler

Node.js 24, npm 11; yerel veri servisleri için Docker. Test edilmiş tarayıcı: Chromium. iPad Safari / Edge üzerinde gerçek cihaz kontrolü ayrıca gereklidir. Her bulut görevi zaten izoledir; mevcut checkout kullanılır, worktree oluşturulmaz.

## Bulutta / yerelde hızlı başlangıç

```sh
cd /workspace/studycoach # kendi checkout yolunuzla değiştirin
npm ci
npm run local:stack
npm run local:gateway
```

Gateway açık kalırken başka terminalde:

```sh
npm run seed
npm run dev
```

`local:stack` yalnız gerekli PostgreSQL 17, Supabase Auth ve PostgREST container'larını çalıştırır. Tam Supabase CLI paketi bulut Docker disk sınırına sığmadığı için bu küçük geliştirme düzeni sağlanmıştır. Studio, Storage ve Realtime bu uygulama tarafından kullanılmaz. Gateway yalnız `127.0.0.1` üzerinde Auth/REST yollarını yönlendirir; **üretim için kullanılmaz**. Kaynak veriler `studycoach-pg` Docker volume'unda saklanır. Süreçler yeni görevde yeniden başlatılır. İmaj indirmeleri için Docker Hub ve `ghcr.io`, bağımlılıklar için npm erişimi gerekir.

Demo: Zeynep, 7. sınıf; belgede tanımlı görevler, iki çalışma bloğu, üç ödül. Seed yalnız local URL üzerinde çalışır ve tamamlanmış seed'i tekrarlamaz. Her kurulumda rastgele üretilen demo parolası ve e-posta bilgileri Git dışında `.local-demo.json` dosyasındadır. Bu dosyayı, `.env.local` veya `.local-stack.*` dosyalarını paylaşmayın/commitlemeyin. Demo hesabı gerçek kullanıcı verisi içermemelidir.

Yerel ortamı durdurmak için yalnız bu projenin üç container'ı:

```sh
docker stop studycoach-auth studycoach-rest studycoach-db
```

Gateway ve Next süreçlerini kendi terminallerinde Ctrl+C ile durdurun. Yeniden başlatmak için `local:stack`, `local:gateway`, `dev`. Var olan uzak Supabase `.env.local` ayarı local script tarafından ezilmez. Volume silmek tüm yerel veriyi kaybettirir; otomatik sıfırlama yapılmaz.

## Supabase Cloud / Vercel

1. Supabase projesi oluşturun. SQL migration'ı `supabase/migrations/202610230001_foundation.sql` sırayla SQL Editor veya Supabase CLI migration workflow'u üzerinden uygulayın.
2. `.env.example` dosyasını `.env.local` olarak kopyalayıp proje URL ve publishable/anon anahtarını girin. Üretim uygulaması service-role anahtarı **kullanmaz**; yalnız yerel demo seed aracı kullanır.
3. Auth Site URL ve izinli yönlendirmeleri kendi HTTPS alan adınıza ayarlayın. Üretimde e-posta onayını etkinleştirin; kullanıcı onaydan sonra giriş yaparak profil oluşturmayı tamamlar. SMTP/backup/PITR ayarları sağlayıcı panelinden yönetilir.
4. Vercel'de aynı iki `NEXT_PUBLIC_*` ayarını tanımlayın; `npm run build`. Development gateway/Docker/seed üretime taşınmaz. Anahtarları kaynak koduna yazmayın.
5. Önce ebeveyn kaydı, ardından öğrenci profili oluşturun. Ebeveyn panelindeki davet koduyla **ayrı e-posta** kullanarak öğrenci kaydı oluşturun. Aile üyeliği kullanıcı tarafından gönderilen family ID'ye güvenmez.

Tam yerel Supabase CLI alternatifinde `npx supabase start`, `npm run local:env`, `npm run seed` kullanılabilir; daha fazla disk gerekir. `supabase/config.toml` bu alternatif içindir. Production migration için yerel `_local_migrations` tablosu gerekli değildir.

## Test ve doğrulama

```sh
npm test                  # 7 domain testi
npm run typecheck
npm run build
npm run test:integration   # Auth/REST ve yerel DB açık; gerçek 5 dakika sürer
npm run test:e2e           # Next + gateway + seed açık; Playwright Chromium
```

Integration testleri ayrı test aileleri oluşturur; denetim geçmişi nedeniyle yerel test kayıtlarını silmez. Üretim URL'lerine karşı çalıştırmayın. Testte asgari çalışma süresi düşürülmez veya saat değiştirilmez. E2E testleri demo verisinde görev oluşturur ve sayaç durumunu değiştirir. Playwright mevcut `/usr/bin/chromium` kullanır; farklı makinelerde `PLAYWRIGHT_CHROMIUM_EXECUTABLE` ayarlayın veya `npx playwright install chromium` çalıştırın.

## Güvenlik / veri

Tüm browser erişimi Supabase JWT + RLS kullanır. Doğrudan ledger yazımı için policy yoktur. `perform_action` atomik RPC'si aynı öğrenci satırını kilitleyerek tamamlama/geri alma/onay/düzeltme yarışlarını serileştirir. Kaynak işlem başına unique index, birden fazla ödülü engeller. Öğrenci görev ödülü sunucuda 5 XP / 0 Coin ile sınırlandırılır. Öğrencilerin kendi ödülünü onaylaması veya başka aile verisini okuması engellenir. Coin yetersizse geri alma/onay reddedilir.

Çocuk verisi analytics/reklam servisine gönderilmez; public profil veya karşılaştırma yoktur. Ad, e-posta ve sınıf dışında okul/konum/doğum tarihi istenmez. Tüm tarihler UTC timestamp, gün kuralları Europe/Istanbul üzerinden değerlendirilir.

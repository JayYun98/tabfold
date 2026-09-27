<div align="center">

# Tabfold

**Daha az sekme karmaşası. Daha ferah bir zihin.**

Kalabalık Chrome pencerelerini düzenli, daraltılabilir sekme gruplarına dönüştürün — **herhangi bir değişiklikten önce önizleyin**.

**Önizle → Gözden geçir → Uygula**

Chrome Manifest V3 · Önce yerel işlem · Jev 1.13 · Çalışma zamanı bağımlılığı yok

[English](../README.md) · [Français](README.fr.md) · [한국어](README.ko.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [Русский](README.ru.md) · [日本語](README.ja.md) · [Türkçe](README.tr.md) · [Español](README.es.md)

<img src="../docs/assets/cover.svg" alt="Tabfold kapak görseli" width="100%" />

</div>

## Neden Tabfold?

- **Önce önizleme** — Tabfold sekmelerinize dokunmadan önerilen grupları görün.
- **YZ olmadan çalışır** — API anahtarı gerektirmeden başlıkları TF-IDF ve kosinüs benzerliğiyle temkinli biçimde kümeler.
- **İstediğinizde YZ** — daha akıllı sınıflandırma için Jev'i OpenRouter veya TypeSafe üzerinden kullanın.
- **Bağlamınız korunur** — sekmeler özgün pencerelerinde kalır; gruplar yalnızca dağınıklığı azaltmak için daraltılır.
- **Varsayılan olarak güvenli** — sabitlenmiş, ses çalan, gizli, tarayıcı içi ve zaten gruplanmış sekmeler korunur.
- **Kolayca geri dönün** — son gruplandırmayı geri alın ve kopya temizliğinde kaldırılan URL'leri kurtarın.

<img src="../docs/assets/popup-en.png" alt="Tabfold açılır pencere önizlemesi" width="100%" />

## Nasıl çalışır?

1. Yerel kümeleme veya YZ ile **önizleyin**.
2. Önerilen grupları **gözden geçirin**.
3. Sonuç uygunsa **uygulayın**.

Hepsi bu. Tabfold, pencereleri birleştirmeden veya sayfalarınızı değiştirmeden sekmeleri gruplar ve daraltır.

Gruplar YZ çalışmadan önce görünür. Koruma modu mevcut üyeleri ve görünümü değiştirmeden eşleşen sekmeleri aynı penceredeki gruplara ekler. Diğer pencerelerdeki adlandırılmış kategoriler ayrı yerel gruplar oluşturabilir; sekmeler pencereler arasında taşınmaz. Yeniden gruplandırma, adlandırılmış grupların amacını koruyarak üyeleri yeniden düzenler; yalnızca ana makine adı taşıyan gruplar kategori şablonu sayılmaz.

Sabitlenmiş, ses çalan, gizli ve dahili sekmeler korunur. Yalnızca önerilen gruplar uygulanır; yeni gruplar en az iki sekme gerektirir, eşleşmeyen tek sekmeler yerinde kalır. Geri alma, mümkün olduğunda özgün grupları geri yükler; tam sekme sırası garanti edilmez.

Hızlı önizleme, başlıkları TF-IDF, kosinüs benzerliği ve tam bağlantı (complete-link) yöntemiyle temkinli biçimde kümeler. Embedding veya önceden eğitilmiş sinir ağı kullanmaz; model indirmez ve sunucuya istek göndermez. Tek sabit sınıflandırma kuralı, görsel dosyalarını uzantılarına göre **Images** altında toplamaktır. Siteler veya konular için sabit kategori eşleştirmeleri yoktur.

Yeniden gruplandırma, kayıtlı kategorileri yok sayma, mevcut grup adlarını kullanma ve yeni öneriler ayrı ayrı ayarlanır. YZ kararsızsa sekme sınıflandırılmadan kalır; sözcüksel kümelemeye başvurulmaz. Mevcut adlar kullanılırken grup adları, açıklamalar, örnek başlıklar ve sorgu parametreleri çıkarılmış URL’ler gönderilebilir. Yeni grup önerileri deneyseldir; doğruluk garantisi yoktur, kabul etmeden veya uygulamadan önce inceleyin.

**Mevcut grup adlarını kullan** varsayılan olarak açıktır: **Kayıtlı kategorileri yok say** seçeneğinden bağımsız olarak, yeniden gruplandırmayla birlikte kapatıldığında eski grup bağlamı olmadan başlanır; mevcut grup bilgileri ve örnekleri gönderilmez, ancak uygun sekmelerin başlıkları ve URL’leri YZ’ye gönderilmeye devam eder.

## Kurulum

1. Bu depoyu indirin veya klonlayın.
2. `chrome://extensions` adresini açın.
3. **Geliştirici modu** seçeneğini etkinleştirin.
4. **Paketlenmemiş öğe yükle** düğmesine tıklayıp `extension` klasörünü seçin.
5. **Tabfold** uzantısını araç çubuğuna sabitleyin.

Derleme veya paket kurulumu gerekmez.

## Kendinize göre ayarlayın

**Ayarlar** bölümünden:

- En fazla **12 özel kategori** oluşturabilirsiniz
- Sekmeleri **mevcut sıra / başlık / en uzun süredir kullanılmayanlar** ölçütüne göre sıralayabilirsiniz
- Önerilen yeni konuları eklemeden önce inceleyebilirsiniz
- Kategorileri JSON olarak içe veya dışa aktarabilirsiniz
- İngilizce, Fransızca, Korece, Basitleştirilmiş Çince, Geleneksel Çince, Rusça, Japonca, Türkçe ve İspanyolca arasında geçiş yapabilirsiniz

“Diğer” otomatik olarak ele alınır.

## YZ isteğe bağlıdır

Yerel önizleme tamamen tarayıcınızda kalır.

YZ önizlemesi için **Ayarlar → YZ bağlantısı** bölümünde **OpenRouter** veya **TypeSafe** seçin ve ilgili sağlayıcının API anahtarını ekleyin.

**Yeni grup önerileri** açıkken OpenRouter, adları ve ölçütleri GPT-4.1 ile üretir, sekmeleri Jev ile sınıflandırır. Yeni gruplar yalnızca bu önizlemeye eklenir; kayıtlı kategoriler değişmez. Ek çağrılar ve ücretler oluşabilir. Doğrudan TypeSafe bağlantısı yalnızca Jev kullanır ve otomatik olarak OpenRouter’a geçmez.

- OpenRouter sınıflandırma için Jev, yeni grup adları için GPT-4.1 kullanır. Ek API çağrıları gerekebilir.
- TypeSafe, **Jev 1.13** kullanır
- API anahtarları Chrome'un **oturum depolamasında** tutulur ve tarayıcı kapandığında silinir
- **Başka bir sağlayıcıya otomatik geçiş yapılmaz**

## Gizlilik

| | |
|---|---|
| **Yerel önizleme** | Dışarıya veri gönderilmez |
| **YZ önizlemesi** | Sekme başlıkları, URL kaynakları/yolları ve kategori ölçütleri gönderilir |
| **Asla gönderilmeyenler** | Sayfa içerikleri, URL kimlik bilgileri, sorgu dizeleri, URL parçaları |
| **API anahtarları** | Yalnızca oturum boyunca saklanır |
| **Analiz / reklam** | Yok |

Başlıklar ve URL yolları yine de hassas bilgiler içerebilir. Ayrıntılar için [Gizlilik](../docs/PRIVACY.md) belgesine bakın.

## Geliştirme

**Node.js 22+** gerektirir.

```bash
npm test
npm run check
```

Düz JavaScript ve yerel Chrome API'leri kullanılır; çalışma zamanı bağımlılığı veya uzaktan yüklenen kod yoktur.

[Doğrulama](../docs/VALIDATION.md) · [Yayın notları](../docs/LAUNCH.md) · [Kategori JSON örneği](../docs/categories.example.json)

---

**Daraltma görsel bir düzenlemedir; içerik özeti değildir ve bellek kullanımını azaltmayı garanti etmez.**

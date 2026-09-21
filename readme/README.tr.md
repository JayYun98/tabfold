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
- **YZ olmadan çalışır** — TF-IDF ve kosinüs benzerliğiyle başlık/URL terimlerini yerel olarak kümeler; API anahtarı gerekmez.
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

Varsayılan olarak mevcut gruplar korunur. Mevcut gruplar YZ çalıştırılmadan önce görünür. YZ, grup adlarını ve örnek sekme başlıkları ile URL yollarını kullanarak aynı penceredeki gruplara öncelik verir. Eşleşen gruplanmamış sekmeler bu gruplara eklenir; diğerleri yeni gruplar oluşturur. Mevcut üyeler, adlar, renkler ve daraltma durumları değişmez. Geri alma, mevcut gruplardan yalnızca Tabfold tarafından eklenen sekmeleri çıkarır. Örnek başlıklar ve URL yolları seçilen YZ sağlayıcısına gönderilir.

**Tüm uygun sekmeleri yeniden grupla** seçeneği, mevcut grup adlarını ve bağlamını yok sayarak her penceredeki uygun gruplanmış ve gruplanmamış sekmeleri yeniden düzenler. Sabitlenmiş, ses çalan, gizli ve dahili sekmeler korunur. Geri alma, mümkün olduğunda özgün grupları geri yükler; sekmelerin tam özgün sırası garanti edilmez. Yalnızca önerilen gruplar uygulanır. Yeni gruplar en az iki sekme gerektirir; eşleşmeyen tek sekmeler yerinde kalır.

Hızlı önizleme, başlık/URL terimleri üzerinde istatistiksel TF-IDF ağırlıklarını ve kosinüs benzerliğini tamamen tarayıcıda hesaplar. Diller arasında çevrilmiş anlamları değil, sözcüksel benzerlikleri karşılaştırır. Önceden eğitilmiş bir sinir ağı veya TensorFlow modeli değildir: bağımlılık, model indirme veya sunucu isteği yoktur. Yeniden kullanılabilir JavaScript kümeleme modülü Node.js üzerinde de çalışır.

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

- OpenRouter, **Decisions API** kullanır
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

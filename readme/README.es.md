<div align="center">

# Tabfold

**Menos ruido de pestañas. Más espacio para pensar.**

Convierte ventanas de Chrome abarrotadas en grupos de pestañas ordenados y plegables, **con una vista previa antes de cambiar nada**.

**Vista previa → Revisión → Aplicación**

Chrome Manifest V3 · Prioridad local · Jev 1.13 · Sin dependencias en tiempo de ejecución

[English](../README.md) · [Français](README.fr.md) · [한국어](README.ko.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [Русский](README.ru.md) · [日本語](README.ja.md) · [Türkçe](README.tr.md) · [Español](README.es.md)

<img src="../docs/assets/cover.svg" alt="Portada de Tabfold" width="100%" />

</div>

## Por qué Tabfold

- **Primero, una vista previa** — consulta los grupos propuestos antes de que Tabfold modifique tus pestañas.
- **Funciona sin IA** — agrupa títulos de forma conservadora con TF-IDF y similitud coseno, sin clave API.
- **IA cuando la necesites** — usa Jev a través de OpenRouter o TypeSafe para una clasificación más inteligente.
- **Conserva tu contexto** — las pestañas permanecen en sus ventanas originales; los grupos se pliegan para reducir el desorden.
- **Protección por defecto** — protege las pestañas fijadas, con audio, de incógnito, internas y ya agrupadas.
- **Recuperación sencilla** — deshaz la última agrupación y recupera las URL eliminadas al limpiar duplicados.

<img src="../docs/assets/popup-en.png" alt="Vista previa del panel de Tabfold" width="100%" />

## Cómo funciona

1. Genera una **vista previa** con agrupación local o IA.
2. **Revisa** los grupos propuestos.
3. **Aplica** los cambios cuando el resultado te convenza.

Eso es todo. Tabfold agrupa y pliega pestañas sin fusionar ventanas ni reemplazar tus páginas.

Los grupos son visibles antes de ejecutar la IA. El modo conservar añade pestañas coincidentes a grupos de la misma ventana sin cambiar sus miembros ni su aspecto. Las categorías con nombre de otras ventanas pueden crear grupos locales separados; las pestañas nunca cambian de ventana. Reagrupar reconstruye los miembros conservando el propósito de los grupos con nombre; los grupos llamados solo como un host no sirven de plantilla.

Las pestañas fijadas, con audio, de incógnito e internas siguen protegidas. Solo se aplican grupos propuestos; los nuevos necesitan dos pestañas y las pestañas sueltas permanecen donde están. Deshacer restaura los grupos originales cuando es posible, sin garantizar el orden exacto.

La vista rápida agrupa títulos de forma conservadora con TF-IDF, similitud coseno y enlace completo (complete-link). No usa embeddings ni redes neuronales preentrenadas, no descarga modelos ni contacta con servidores. La única regla fija clasifica los archivos de imagen como **Images** según su extensión; no hay categorías impuestas por sitio o tema.

La ventana permite configurar por separado la reagrupación, las categorías guardadas, los nombres de grupos existentes y las sugerencias. Si la IA no tiene suficiente certeza, la pestaña queda sin clasificar, sin recurrir a un método léxico. Al usar nombres existentes, pueden enviarse nombres, descripciones, títulos de ejemplo y URL sin parámetros de consulta. Las sugerencias nuevas son experimentales: no se garantiza su exactitud y deben revisarse antes de aceptarlas o aplicarlas.

**Usar nombres de grupos existentes** está activado por defecto: desactívalo y activa la reagrupación para empezar sin su contexto, independientemente de **Ignorar categorías guardadas**; no se enviarán metadatos ni ejemplos de grupos existentes, aunque los títulos y URL de las pestañas elegibles seguirán enviándose a la IA.

## Instalación

1. Descarga o clona este repositorio.
2. Abre `chrome://extensions`.
3. Activa el **Modo de desarrollador**.
4. Haz clic en **Cargar descomprimida** y selecciona la carpeta `extension`.
5. Fija **Tabfold** en la barra de herramientas.

No hace falta compilar ni instalar paquetes.

## A tu medida

Desde **Configuración**, puedes:

- Crear hasta **12 categorías personalizadas**
- Ordenar las pestañas por **orden actual / título / menos usadas recientemente**
- Revisar los nuevos temas sugeridos antes de añadirlos
- Importar o exportar categorías en formato JSON
- Cambiar entre inglés, francés, coreano, chino simplificado, chino tradicional, ruso, japonés, turco y español

La categoría «Otros» se gestiona automáticamente.

## La IA es opcional

La vista previa local se procesa íntegramente en tu navegador.

Para usar la vista previa con IA, elige **OpenRouter** o **TypeSafe** en **Configuración → Conexión de IA** y añade la clave de API de ese proveedor.

Con las **sugerencias de nuevos grupos** activadas, OpenRouter usa GPT-4.1 para generar nombres y criterios, y Jev para clasificar las pestañas. Los grupos pertenecen a esa vista previa y no modifican las categorías guardadas. Puede haber llamadas y cargos adicionales. La conexión directa con TypeSafe utiliza solo Jev y no cambia automáticamente a OpenRouter.

- OpenRouter usa Jev para clasificar y GPT-4.1 para crear nombres de grupos. Puede requerir llamadas adicionales a la API.
- TypeSafe utiliza **Jev 1.13**
- Las claves de API se guardan en el **almacenamiento de sesión** de Chrome y se borran al cerrar el navegador
- **No se cambia automáticamente a otro proveedor**

## Privacidad

| | |
|---|---|
| **Vista previa local** | Sin transmisión externa |
| **Vista previa con IA** | Envía títulos de pestañas, orígenes y rutas de URL, y criterios de categorías |
| **Nunca se envían** | Contenido de las páginas, credenciales de URL, parámetros de consulta ni fragmentos |
| **Claves de API** | Almacenamiento solo durante la sesión |
| **Analítica / anuncios** | Ninguno |

Los títulos y las rutas de las URL también pueden contener información sensible. Consulta [Privacidad](../docs/PRIVACY.md) para más detalles.

## Desarrollo

Requiere **Node.js 22 o posterior**.

```bash
npm test
npm run check
```

JavaScript sin frameworks, API nativas de Chrome, sin dependencias en tiempo de ejecución y sin código remoto.

[Validación](../docs/VALIDATION.md) · [Notas de lanzamiento](../docs/LAUNCH.md) · [Ejemplo de categorías en JSON](../docs/categories.example.json)

---

**Plegar es una forma de compactar la vista; no resume el contenido ni garantiza una reducción del uso de memoria.**

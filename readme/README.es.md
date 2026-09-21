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
- **Funciona sin IA** — TF-IDF y similitud coseno agrupan localmente los términos de títulos y URL, sin clave API.
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

Por defecto, se conservan los grupos existentes. Los grupos existentes son visibles antes de ejecutar la IA. La IA prioriza los grupos de la misma ventana según sus nombres y ejemplos de títulos y rutas de URL. Las pestañas sin agrupar que coincidan se añaden a esos grupos; las demás forman grupos nuevos. Los miembros, nombres, colores y estados contraídos existentes no cambian. Deshacer solo retira de los grupos existentes las pestañas añadidas por Tabfold. Los títulos y las rutas de URL de ejemplo se envían al proveedor de IA seleccionado.

Elige **Reagrupar todas las pestañas elegibles** para ignorar los nombres y el contexto de los grupos existentes y reasignar las pestañas elegibles, agrupadas o no, dentro de cada ventana. Las pestañas fijadas, con audio, de incógnito e internas siguen protegidas. Deshacer restaura los grupos originales cuando es posible, sin garantizar el orden exacto original. Solo se aplican los grupos propuestos. Los grupos nuevos requieren al menos dos pestañas; las pestañas sueltas sin coincidencias permanecen donde están.

La vista rápida calcula pesos estadísticos TF-IDF y similitud coseno sobre términos de títulos y URL, dentro del navegador. Compara semejanzas léxicas, no significados traducidos entre idiomas. No es un modelo neuronal preentrenado ni de TensorFlow: no requiere dependencias, descargas de modelos ni solicitudes al servidor. El módulo JavaScript reutilizable también funciona en Node.js.

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

- OpenRouter utiliza la **Decisions API**
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

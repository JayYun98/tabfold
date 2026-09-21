<div align="center">

# Tabfold

**Moins de bruit dans vos onglets. Plus d’espace pour penser.**

Transformez vos fenêtres Chrome encombrées en groupes d’onglets clairs et repliables — **avec un aperçu avant toute modification**.

**Prévisualiser → Vérifier → Appliquer**

Chrome Manifest V3 · Priorité au local · Jev 1.13 · Aucune dépendance à l’exécution

[English](../README.md) · [Français](README.fr.md) · [한국어](README.ko.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [Русский](README.ru.md) · [日本語](README.ja.md) · [Türkçe](README.tr.md) · [Español](README.es.md)

<img src="../docs/assets/cover.svg" alt="Présentation de Tabfold" width="100%" />

</div>

## Pourquoi Tabfold

- **L’aperçu d’abord** — consultez les groupes proposés avant que Tabfold ne touche à vos onglets.
- **Fonctionne sans IA** — TF-IDF et similarité cosinus regroupent localement les termes des titres et URL, sans clé API.
- **L’IA à la demande** — utilisez Jev via OpenRouter ou TypeSafe pour une classification plus fine.
- **Préserve votre contexte** — les onglets restent dans leur fenêtre d’origine ; les groupes se replient simplement pour libérer de l’espace.
- **Protection par défaut** — les onglets épinglés, audibles, privés, internes et déjà groupés sont protégés.
- **Récupération facile** — annulez le dernier regroupement et restaurez les URL supprimées lors du nettoyage des doublons.

<img src="../docs/assets/popup-en.png" alt="Aperçu de la fenêtre Tabfold" width="100%" />

## Fonctionnement

1. **Prévisualisez** avec le regroupement local ou l’IA.
2. **Vérifiez** les groupes proposés.
3. **Appliquez** lorsque le résultat vous convient.

C’est tout. Tabfold regroupe et replie les onglets sans fusionner les fenêtres ni remplacer vos pages.

Les groupes sont visibles avant de lancer l’IA. Le mode conservation ajoute les onglets correspondants aux groupes de la même fenêtre sans modifier leurs membres ni leur apparence. Les catégories nommées d’autres fenêtres peuvent créer des groupes locaux distincts ; aucun onglet ne change de fenêtre. Le reclassement reconstruit les groupes en conservant leur objectif ; les noms réduits à un nom d’hôte ne servent pas de modèles.

Les onglets épinglés, audibles, privés et internes restent protégés. Seuls les groupes proposés sont appliqués ; un nouveau groupe exige deux onglets, les onglets isolés restent en place. L’annulation restaure les groupes d’origine si possible, sans garantir l’ordre exact.

L’aperçu rapide utilise des règles légères liées à l’objectif des catégories (Media/SNS pour YouTube, JobRecruit pour les offres d’emploi), puis TF-IDF et similarité cosinus pour les autres onglets. Cette approche lexicale n’utilise ni embeddings ni réseau neuronal préentraîné, téléchargement de modèle ou requête serveur. Le module JavaScript fonctionne aussi sous Node.js.

La fenêtre mémorise séparément le reclassement, l’exclusion des catégories enregistrées et les suggestions. Exclure les catégories retire les choix IA enregistrés/par défaut sans les supprimer ; les noms des groupes Chrome restent un contexte, même lors du reclassement. L’IA peut recevoir leurs noms, un objectif général et jusqu’à six exemples variés de titres et d’origines/chemins d’URL sans paramètres de requête. Seuls les onglets sans correspondance alimentent les nouveaux sujets, validés par Jev.

**Utiliser les noms des groupes existants** est activé par défaut : désactivez-le et activez le reclassement pour repartir sans leur contexte, indépendamment d’**Ignorer les catégories enregistrées** ; aucune métadonnée ni aucun exemple de groupe existant n’est alors envoyé, mais les titres et URL des onglets admissibles sont toujours transmis à l’IA.

## Installation

1. Téléchargez ou clonez ce dépôt.
2. Ouvrez `chrome://extensions`.
3. Activez le **Mode développeur**.
4. Cliquez sur **Charger l’extension non empaquetée** et sélectionnez le dossier `extension`.
5. Épinglez **Tabfold** à la barre d’outils.

Aucune compilation ni installation de paquet n’est nécessaire.

## Personnalisation

Dans les **Paramètres**, vous pouvez :

- Créer jusqu’à **12 catégories personnalisées**
- Choisir l’ordre des onglets : **actuel / titre / moins récemment utilisés**
- Vérifier les nouveaux thèmes proposés avant de les ajouter
- Importer ou exporter les catégories au format JSON
- Choisir entre l’anglais, le français, le coréen, le chinois simplifié, le chinois traditionnel, le russe, le japonais, le turc et l’espagnol

La catégorie « Autres » est gérée automatiquement.

## L’IA est facultative

L’aperçu local reste entièrement dans votre navigateur.

Pour l’aperçu IA, choisissez **OpenRouter** ou **TypeSafe** dans **Paramètres → Connexion IA**, puis ajoutez la clé API de ce fournisseur.

- OpenRouter utilise l’**API Decisions**
- TypeSafe utilise **Jev 1.13**
- Les clés API sont conservées dans le **stockage de session** de Chrome et effacées à la fermeture du navigateur
- Il n’y a **aucun basculement automatique vers un autre fournisseur**

## Confidentialité

| | |
|---|---|
| **Aperçu local** | Aucun envoi externe |
| **Aperçu IA** | Envoie les titres, les origines et chemins des URL, ainsi que les critères des catégories |
| **Jamais envoyés** | Contenu des pages, identifiants dans les URL, paramètres de requête, fragments |
| **Clés API** | Stockage limité à la session |
| **Analyse d’usage / publicité** | Aucune |

Les titres et chemins des URL peuvent néanmoins contenir des informations sensibles. Consultez la [confidentialité](../docs/PRIVACY.md) pour en savoir plus.

## Développement

Nécessite **Node.js 22 ou ultérieur**.

```bash
npm test
npm run check
```

JavaScript simple, API natives de Chrome, aucune dépendance à l’exécution et aucun code distant.

[Validation](../docs/VALIDATION.md) · [Notes de lancement](../docs/LAUNCH.md) · [Exemple JSON de catégories](../docs/categories.example.json)

---

**Le repliement est une réduction de l’encombrement visuel, pas un résumé du contenu ni une garantie de réduction de la mémoire utilisée.**

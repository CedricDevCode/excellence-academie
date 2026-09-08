# Guide Complet - Système de Bannières Jumia

## 📱 Visualisation de la Structure

```
┌─────────────────────────────────────────────────────────┐
│         ACCUEIL BOUTIQUE EXCELLENCE ACADÉMIE            │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ╔═══════════════════════════════════════════════════╗  │
│  ║  BANNIÈRE PRINCIPALE (Style Jumia)               ║  │
│  ║  ┌─────────────────┬──────────────────────────┐  ║  │
│  ║  │                 │  • Titre principal        │  ║  │
│  ║  │   IMAGE/        │  • Sous-titre/Prix        │  ║  │
│  ║  │   PRODUIT       │  • Description            │  ║  │
│  ║  │   EN VEDETTE    │  • Bouton d'action        │  ║  │
│  ║  │                 │  • Badge "Promo"          │  ║  │
│  ║  └─────────────────┴──────────────────────────┘  ║  │
│  ╚═══════════════════════════════════════════════════╝  │
│                                                           │
│  ╔═══════╗ ╔═══════╗ ╔═══════╗ ╔═══════╗              │
│  ║ PROMO ║ ║ PROMO ║ ║ PROMO ║ ║ PROMO ║  ← Carrousel  │
│  ╚═══════╝ ╚═══════╝ ╚═══════╝ ╚═══════╝  (secondaire)  │
│                                                           │
│  [Recherche...]         [Catégories] ▼                   │
│                                                           │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│  │ PROD │ │ PROD │ │ PROD │ │ PROD │ │ PROD │          │
│  │ 1500 │ │ 2000 │ │ 3500 │ │ 1000 │ │ 5000 │ Grille  │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘          │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## 🛠️ Architecture du Système

### 1️⃣ BASE DE DONNÉES

**Table ShopBanner**
```sql
ShopBanner {
  id: UUID (PK)
  title: String (required) - Ex: "Nouvelle Collection"
  subtitle: String - Ex: "Jusqu'à -50%"
  description: String - Texte détaillé
  imageUrl: String - URL de l'image
  backgroundColor: String - Dégradé CSS (default: "from-[#FF6B00] to-[#e65c00]")
  badgeText: String - Ex: "Promotion"
  featured: Boolean - Si true, affiché en premier
  displayOrder: Int - Ordre d'affichage (0, 1, 2...)
  isActive: Boolean - Visible ou non
  productId: String (FK) - Produit associé (optional)
  startDate: DateTime - Début de promotion (optional)
  endDate: DateTime - Fin de promotion (optional)
}
```

### 2️⃣ API ENDPOINTS

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/banners/public` | Non | Bannières actives et non expirées |
| GET | `/api/banners` | Oui | Toutes les bannières (admin) |
| GET | `/api/banners/:id` | Oui | Détail d'une bannière |
| POST | `/api/banners` | Oui | Créer une bannière |
| PUT | `/api/banners/:id` | Oui | Modifier une bannière |
| DELETE | `/api/banners/:id` | Oui | Supprimer une bannière |

### 3️⃣ COMPOSANTS FRONTEND

**BannersView.tsx** (Admin)
- Affiche la liste des bannières avec aperçu
- Formulaire de création/édition
- Upload d'image
- Sélection de produit
- Gestion des couleurs et dates

**Shop.tsx** (Client)
- Affiche la bannière principale
- Carrousel des bannières secondaires
- Auto-rotation chaque 5 secondes
- Liens vers les produits

## 🎨 Couleurs de Fond Disponibles

```
1. Orange (Défaut)        from-[#FF6B00] to-[#e65c00]
2. Rouge                   from-red-600 to-red-700
3. Bleu                    from-blue-600 to-blue-700
4. Vert                    from-green-600 to-green-700
5. Violet                  from-purple-600 to-purple-700
6. Rose                    from-pink-600 to-pink-700
```

## 📋 Cas d'Utilisation

### Cas 1: Promotion Temporaire
- **Titre:** "Vente Flash - Documents"
- **Subtitle:** "Seulement 24 heures"
- **Image:** Logo de la promo
- **Produit:** Un document best-seller
- **Dates:** Aujourd'hui à 09:00 → Demain à 09:00
- **Status:** Actif

### Cas 2: Nouvel Arrivage
- **Titre:** "Nouveaux Livres"
- **Subtitle:** "Collection Avril 2026"
- **Image:** Couverture du livre
- **Produit:** Le nouveau livre
- **Dates:** Vides (toujours actif)
- **Status:** Actif
- **Featured:** Oui (affiché en premier)

### Cas 3: Promotion de Catégorie
- **Titre:** "Tous les Livres en Promo"
- **Subtitle:** "-30% sur tout"
- **Image:** Pile de livres
- **Produit:** Vide (lien global)
- **Button:** "Découvrir"

## 🔐 Permissions

| Rôle | Voir | Créer | Modifier | Supprimer |
|------|------|-------|----------|-----------|
| Client | ✅ Public | ❌ | ❌ | ❌ |
| Admin | ✅ Tout | ✅ | ✅ | ✅ |

## 📱 Responsive Design

```
📱 Mobile (< 640px)
- Bannière principale: Texte en haut, image en bas
- Carrousel: 1 banner visible
- Grid produits: 2 colonnes

💻 Tablet (640px - 1024px)
- Bannière: 2 colonnes (texte/image)
- Carrousel: 2-3 banners visibles
- Grid produits: 3 colonnes

🖥️ Desktop (> 1024px)
- Bannière: 2 colonnes (texte/image)
- Carrousel: 4-5 banners visibles
- Grid produits: 5 colonnes
```

## 🚀 Étapes d'Installation

### 1. Appliquer la Migration
```bash
npx prisma migrate deploy
```

### 2. Vérifier les nouveaux fichiers
- ✅ `server/controllers/bannerController.ts` créé
- ✅ `server/routes/bannerRoutes.ts` créé
- ✅ `src/components/BannersView.tsx` créé

### 3. Redémarrer le serveur
```bash
npm run dev
```

### 4. Accéder à l'admin
- Admin Dashboard → Boutique → Bannières

## 💡 Conseils d'Utilisation

### Images
- **Taille recommandée:** 800x400 px (16:9)
- **Format:** PNG ou JPG
- **Optimisation:** Compression recommandée
- **Transparence:** PNG pour la flexibilité

### Texte
- **Titre:** Concis et accrocheur (max 50 caractères)
- **Subtitle:** Court et impactant (max 40 caractères)
- **Description:** Détails pertinents (max 200 caractères)
- **Badge:** 1-2 mots (Ex: "Promo", "Nouveau", "Top Vente")

### Produits
- Lier toujours un produit pour les bannières principales
- Pour les bannières de catégorie, laisser vide et utiliser "Découvrir"
- Les bannières sans produit sont toujours cliquables

### Dates
- **Promotions:** Toujours définir des dates
- **Content permanent:** Laisser les champs vides
- **Saisons:** Par ex: 01/01 → 31/03 pour Q1

## 🔍 Maintenance

### Archiver des bannières
- Mettre `isActive` à `false` (ne pas supprimer)
- Permet de réutiliser plus tard
- Reste visible à l'admin

### Modifier l'ordre
- Utiliser le champ `displayOrder`
- 0 = première position
- Plus grand nombre = plus bas

### Supprimer un produit associé
- Adapter la bannière (changer le produit)
- Ou supprimer la bannière
- Le produit n'est pas supprimé

## 📊 Statistiques Utiles

Monitorer:
- CTR (Click-Through Rate) des bannières
- Conversion par bannière
- Produits en vedette les plus vendus
- Durée moyenne d'affichage

## ❓ Dépannage

### Bannière n'apparaît pas
- Vérifier si `isActive` = true
- Vérifier les dates (pas expirée)
- Vérifier si elle existe dans la DB
- F5 pour rafraîchir le cache

### Image ne s'affiche pas
- Vérifier le URL de l'image
- Vérifier les permissions du dossier uploads
- Télécharger une nouvelle image

### Produit ne s'affiche pas
- Vérifier que le produit existe
- Vérifier que le produit est actif
- Sélectionner un autre produit

---

**Version:** 1.0
**Date:** 04 Juillet 2026
**Statut:** ✅ En Production

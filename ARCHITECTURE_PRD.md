# ARCHITECTURE & PRD : ALSEK PULSE (SaaS Multi-Brand & Tracking Engine)

## 1. VISION DU PROJET
Développer un SaaS propriétaire auto-hébergé (Dashboard Admin + Portail Client en lecture seule) permettant de piloter deux entités commerciales distinctes depuis une seule base de code :
1. **ALSEK MARKETING** (`app.alsek.fr`) : Agence de marketing digital B2B (production vidéo Reels/TikTok, création web, acquisition locale).
2. **VITRINE CALADOISE** (`pro.vitrine-caladoise.fr`) : Média digital local mettant en avant les commerçants, artisans et restaurateurs.

L'outil doit être **ultra-rapide à utiliser au quotidien** (zéro upload de PDF financier, saisie manuelle éclair en 10 secondes, collage simple des liens de vidéos publiées pour le tracking automatique) et **modulaire (Architecture par Plugins)** pour accueillir de futurs moteurs d'automatisation IA.

---

## 2. STACK TECHNIQUE IMPOSÉE
- **Framework Fullstack :** Next.js 15 (App Router, TypeScript) + Tailwind CSS + shadcn/ui + Lucide Icons + Recharts (graphiques).
- **Base de données & ORM :** PostgreSQL 16 avec **Prisma ORM**.
- **Background Jobs & Cron :** Redis + **BullMQ** (processus Worker séparé pour aspirer les vues des posts et exécuter les automatisations futures).
- **Authentification :** Auth.js / NextAuth (Compte Super-Admin pour le fondateur + Liens magiques / Tokens d'accès en lecture seule par fiche client).
- **Conteneurisation :** Docker (Multi-stage build `output: 'standalone'`) derrière Traefik v3 (`traefik-net`).

---

## 3. FONCTIONNALITÉ BONUS : DYNAMIC WHITE-LABELING & MULTI-WORKSPACE
Le SaaS fonctionne selon deux contextes visuels et logiques :

### A. Vue Super-Admin (Interne)
- **Workspace Switcher** en haut de la Sidebar :
  1. `Vue Globale (Holding)` : Consolide le CA, les clients et les vues des 2 entités.
  2. `Portefeuille Alsek Marketing` : Filtre les données et applique le thème visuel Alsek (Dark/Slate, accent Bleu électrique `#2563EB`).
  3. `Portefeuille Vitrine Caladoise` : Filtre les données et applique le thème visuel Vitrine Caladoise (Chaleureux/Terracotta ou Ambre `#D97706`).
- **Pont d'Upsell (Shared Clients) :** Une entreprise cliente (ex: un restaurant) est créée une seule fois en base. Elle peut être rattachée à `Vitrine Caladoise`, à `Alsek Marketing`, ou aux **deux simultanément**. Ses ventes et publications sont taguées par Workspace.

### B. Vue Portail Client (Partage Public Sécurisé `/p/[share_token]`)
- Détection automatique du `Host` HTTP dans le Middleware Next.js :
  - Si l'URL appelée est sur `app.alsek.fr/p/[token]` -> Affiche le logo Alsek Marketing, les couleurs Alsek et les KPIs liés à Alsek.
  - Si l'URL appelée est sur `pro.vitrine-caladoise.fr/p/[token]` -> Affiche le logo Vitrine Caladoise, la charte Vitrine et les KPIs liés au média.

---

## 4. SCHÉMA DE BASE DE DONNÉES (PRISMA SCHEMA)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum WorkspaceSlug {
  ALSEK
  VITRINE
}

enum ClientStatus {
  PROSPECT
  ACTIVE
  PAUSED
  CHURNED
}

enum BillingType {
  ONE_SHOT
  RECURRING_MRR
}

enum PaymentStatus {
  PENDING
  PAID
  OVERDUE
}

enum SocialPlatform {
  INSTAGRAM
  TIKTOK
  FACEBOOK
  YOUTUBE
  LINKEDIN
}

enum ModuleType {
  GMB_AUTO_REPLY        // Réponse IA automatique aux avis Google
  COMPETITOR_WATCH      // Veille concurrentielle locale
  STATE_GRANTS_RADAR    // Veille sur les aides de l'État / subventions TPE-PME
  CLARITY_UX_ALERTS     // Alertes comportementales Microsoft Clarity
}

model Workspace {
  id            String        @id @default(cuid())
  slug          WorkspaceSlug @unique
  name          String
  domain        String
  primaryColor  String
  logoUrl       String?
  clients       ClientWorkspace[]
  sales         CommercialEntry[]
  posts         TrackedPost[]
  createdAt     DateTime      @default(now())
}

model Client {
  id                String            @id @default(cuid())
  companyName       String
  sector            String            // ex: Restaurant, Boutique, Artisan, Cave à vin, Garage
  city              String            @default("Villefranche-sur-Saône")
  nafCode           String?           // Utile pour le futur module Aides de l'État
  employeeCount     Int?              // Utile pour le futur module Aides de l'État
  contactName       String?
  contactEmail      String?
  contactPhone      String?
  avgBasketValue    Float             @default(35.0) // Panier moyen estimé (€)
  shareToken        String            @unique @default(cuid()) // Pour le lien portail client
  
  // Identifiants de Tracking
  websiteUrl        String?           // Site du client OU page dédiée sur vitrine-caladoise.fr
  gmbPlaceId        String?           // Google Maps Place ID
  igUsername        String?
  tiktokUsername    String?
  clarityProjectId  String?
  metaPixelId       String?
  ga4PropertyId     String?

  // Relations
  workspaces        ClientWorkspace[]
  audits            AuditSnapshot[]
  commercialEntries CommercialEntry[]
  trackedPosts      TrackedPost[]
  webMetrics        WebMetricSnapshot[]
  addonModules      ClientModule[]
  automationLogs    AutomationEvent[]

  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
}

model ClientWorkspace {
  id          String       @id @default(cuid())
  clientId    String
  workspaceId String
  status      ClientStatus @default(ACTIVE)
  joinedAt    DateTime     @default(now())

  client      Client       @relation(fields: [clientId], references: [id], onDelete: Cascade)
  workspace   Workspace    @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@unique([clientId, workspaceId])
}

// MODULE 1 : AUDIT FLASH (Snapshot T0 & Évolution)
model AuditSnapshot {
  id              String   @id @default(cuid())
  clientId        String
  isInitialT0     Boolean  @default(false) // True si c'est l'audit de départ avant prestation
  gmbRating       Float?
  gmbReviewsCount Int?
  igFollowers     Int?
  igPostsCount    Int?
  hasWebsite      Boolean  @default(false)
  hasSsl          Boolean  @default(false)
  hasMetaPixel    Boolean  @default(false)
  hasClarity      Boolean  @default(false)
  visibilityScore Int      @default(0)     // Score sur 100
  rawNotes        String?
  recordedAt      DateTime @default(now())

  client          Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
}

// MODULE 2 : SUIVI COMMERCIAL & ROI (100% Saisie Manuelle Rapide - Zéro PDF)
model CommercialEntry {
  id                     String        @id @default(cuid())
  clientId               String
  workspaceId            String
  productName            String        // ex: "Pack Reel Découverte", "Accompagnement Mensuel", "Mise en avant Vitrine"
  billingType            BillingType   @default(ONE_SHOT)
  amountSoldHt           Float         // Montant vendu par Alsek/Vitrine (€)
  paymentStatus          PaymentStatus @default(PENDING)
  clientRevenueGenerated Float         @default(0) // CA généré chez le client (saisi à la main ou calculé)
  leadsGenerated         Int           @default(0) // Nombre de clients/contacts apportés
  periodDate             DateTime      @default(now())
  notes                  String?

  client                 Client        @relation(fields: [clientId], references: [id], onDelete: Cascade)
  workspace              Workspace     @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
}

// MODULE 3 : CONTENT TRACKER (Suivi par lien de publication)
model TrackedPost {
  id            String         @id @default(cuid())
  clientId      String
  workspaceId   String         // Permet de savoir si c'est un post Alsek ou Vitrine Caladoise
  platform      SocialPlatform @default(INSTAGRAM)
  postUrl       String         @unique
  titleOrHook   String?
  thumbnailUrl  String?
  publishedAt   DateTime       @default(now())
  isActiveTrack Boolean        @default(true)

  client        Client         @relation(fields: [clientId], references: [id], onDelete: Cascade)
  workspace     Workspace      @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  metrics       PostMetricSnapshot[]
}

model PostMetricSnapshot {
  id             String      @id @default(cuid())
  postId         String
  views          Int         @default(0)
  likes          Int         @default(0)
  comments       Int         @default(0)
  shares         Int         @default(0)
  saves          Int         @default(0)
  engagementRate Float       @default(0.0)
  recordedAt     DateTime    @default(now())

  post           TrackedPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  @@index([postId, recordedAt])
}

// MODULE 4 : WEB, CLARITY & PIXEL METRICS
model WebMetricSnapshot {
  id                String   @id @default(cuid())
  clientId          String
  sessionsCount     Int      @default(0)
  uniqueVisitors    Int      @default(0)
  clarityRageClicks Int      @default(0)
  clarityDeadClicks Int      @default(0)
  pixelPageViews    Int      @default(0)
  pixelLeadsOrCalls Int      @default(0) // Clics tel, itinéraire, formulaire
  recordedAt        DateTime @default(now())

  client            Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
}

// MODULE 5 : ARCHITECTURE EXTENSIBLE (PLUGINS & AUTOMATISATIONS FUTURES)
model ClientModule {
  id          String     @id @default(cuid())
  clientId    String
  moduleType  ModuleType
  isEnabled   Boolean    @default(false)
  configJson  Json?      // Stocke les paramètres spécifiques (ex: ton de réponse IA GMB, liste des concurrents, critères d'aides)
  updatedAt   DateTime   @updatedAt

  client      Client     @relation(fields: [clientId], references: [id], onDelete: Cascade)
  @@unique([clientId, moduleType])
}

model AutomationEvent {
  id          String     @id @default(cuid())
  clientId    String
  moduleType  ModuleType
  title       String     // ex: "Nouvel avis 5* répondu", "Aide numérique 1500€ détectée"
  payloadJson Json?
  status      String     @default("SUCCESS") // PENDING_APPROVAL, SUCCESS, ALERT
  createdAt   DateTime   @default(now())

  client      Client     @relation(fields: [clientId], references: [id], onDelete: Cascade)
}
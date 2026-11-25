# Generate CSIRT-ARPT stakeholder PowerPoint presentation
$ErrorActionPreference = 'Stop'
$outputDir = Join-Path $PSScriptRoot ''
$outputPath = Join-Path $outputDir 'CSIRT-ARPT_Presentation.pptx'

# Colors (BGR for PowerPoint COM)
function Rgb($r, $g, $b) { return ($b -shl 16) -bor ($g -shl 8) -bor $r }

$cForest = Rgb 10 61 43      # #0a3d2b
$cPrimary = Rgb 13 92 61     # #0d5c3d
$cMid = Rgb 31 107 66        # #1f6b42
$cWhite = Rgb 255 255 255
$cInk = Rgb 18 48 30         # #12301e
$cMuted = Rgb 91 111 100     # #5b6f64
$cSoft = Rgb 232 245 238     # #e8f5ee
$cLine = Rgb 215 228 219     # #d7e4db
$cAccent = Rgb 212 175 55    # gold accent subtle

$ppLayoutBlank = 12

$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = [Microsoft.Office.Core.MsoTriState]::msoTrue
$pres = $ppt.Presentations.Add()

# Widescreen 16:9
$pres.PageSetup.SlideWidth = 1219.2   # 13.333"
$pres.PageSetup.SlideHeight = 685.8   # 7.5"

function Add-ShapeRect($slide, $left, $top, $width, $height, $fill) {
  $s = $slide.Shapes.AddShape(1, $left, $top, $width, $height) # msoShapeRectangle
  $s.Fill.Solid()
  $s.Fill.ForeColor.RGB = $fill
  $s.Line.Visible = 0
  return $s
}

function Add-TextBox($slide, $left, $top, $width, $height, $text, $size, $bold, $color, $align = 1) {
  $tb = $slide.Shapes.AddTextbox(1, $left, $top, $width, $height) # msoTextOrientationHorizontal
  $tf = $tb.TextFrame
  $tf.WordWrap = -1
  $tf.TextRange.Text = $text
  $tf.TextRange.Font.Name = 'Calibri'
  $tf.TextRange.Font.Size = $size
  $tf.TextRange.Font.Bold = if ($bold) { -1 } else { 0 }
  $tf.TextRange.Font.Color.RGB = $color
  $tf.TextRange.ParagraphFormat.Alignment = $align # 1=left 2=center
  $tf.MarginLeft = 6
  $tf.MarginRight = 6
  $tf.MarginTop = 4
  $tf.MarginBottom = 4
  return $tb
}

function Add-Bullets($slide, $left, $top, $width, $height, [string[]]$items, $size = 18) {
  $text = ($items | ForEach-Object { $_ }) -join "`r"
  $tb = $slide.Shapes.AddTextbox(1, $left, $top, $width, $height)
  $tf = $tb.TextFrame
  $tf.WordWrap = -1
  $tf.TextRange.Text = $text
  $tf.TextRange.Font.Name = 'Calibri'
  $tf.TextRange.Font.Size = $size
  $tf.TextRange.Font.Color.RGB = $cInk
  $tr = $tf.TextRange
  for ($i = 1; $i -le $tr.Paragraphs().Count; $i++) {
    $p = $tr.Paragraphs($i)
    $p.ParagraphFormat.Bullet.Visible = -1
    $p.ParagraphFormat.Bullet.Type = 1
    $p.ParagraphFormat.SpaceAfter = 10
    $p.ParagraphFormat.SpaceBefore = 2
    $p.Font.Name = 'Calibri'
    $p.Font.Size = $size
    $p.Font.Color.RGB = $cInk
  }
  return $tb
}

function New-ContentSlide($title, [string[]]$bullets, $eyebrow = 'CSIRT-ARPT') {
  $slide = $pres.Slides.Add($pres.Slides.Count + 1, $ppLayoutBlank)
  # left accent bar
  [void](Add-ShapeRect $slide 0 0 18 685.8 $cPrimary)
  # top bar
  [void](Add-ShapeRect $slide 0 0 1219.2 10 $cForest)
  # footer strip
  [void](Add-ShapeRect $slide 0 650 1219.2 36 $cSoft)
  Add-TextBox $slide 36 656 500 24 'CSIRT-ARPT  ·  ARPT Guinée' 11 $false $cMuted 1 | Out-Null
  Add-TextBox $slide 900 656 280 24 'Confidentiel — usage interne' 10 $false $cMuted 3 | Out-Null

  Add-TextBox $slide 40 28 700 22 $eyebrow 12 $true $cPrimary 1 | Out-Null
  Add-TextBox $slide 40 52 1100 48 $title 30 $true $cForest 1 | Out-Null
  # underline
  [void](Add-ShapeRect $slide 40 108 90 4 $cMid)
  Add-Bullets $slide 48 130 1080 480 $bullets 19 | Out-Null
  return $slide
}

# ========== SLIDE 1 — Title ==========
$s1 = $pres.Slides.Add(1, $ppLayoutBlank)
[void](Add-ShapeRect $s1 0 0 1219.2 685.8 $cForest)
[void](Add-ShapeRect $s1 0 0 1219.2 8 $cAccent)
[void](Add-ShapeRect $s1 0 520 1219.2 166 $cPrimary)
Add-TextBox $s1 60 80 1100 28 'AUTORITÉ DE RÉGULATION DES POSTES ET TÉLÉCOMMUNICATIONS' 13 $true $cSoft 1 | Out-Null
Add-TextBox $s1 60 160 1100 70 'CSIRT-ARPT' 48 $true $cWhite 1 | Out-Null
Add-TextBox $s1 60 240 1000 50 'Plateforme nationale de réponse aux incidents de cybersécurité' 22 $false $cSoft 1 | Out-Null
Add-TextBox $s1 60 300 900 30 'Portail public  ·  Console opérationnelle  ·  Veille & signalement' 15 $false (Rgb 168 201 184) 1 | Out-Null
Add-TextBox $s1 60 545 700 30 'Présentation institutionnelle' 16 $true $cWhite 1 | Out-Null
Add-TextBox $s1 60 580 900 28 'csirt.arpt.gov.gn  ·  csirt@arpt.gov.gn  ·  Prise en charge 24h/24' 13 $false $cSoft 1 | Out-Null
Add-TextBox $s1 900 580 280 28 (Get-Date -Format 'dd MMMM yyyy') 12 $false $cSoft 3 | Out-Null

# ========== SLIDE 2 — Agenda ==========
New-ContentSlide 'Ordre du jour' @(
  'Contexte et mandat du CSIRT-ARPT',
  'Architecture de la solution (public + console)',
  'Parcours usagers : signalement, suivi, alertes',
  'Contenus, veille et accompagnements',
  'Console opérationnelle : incidents & édition',
  'Gouvernance, sécurité et bénéfices',
  'Prochaines étapes et décisions'
) 'Présentation' | Out-Null

# ========== SLIDE 3 — Contexte ==========
New-ContentSlide 'Contexte & mandat' @(
  'CERT / CSIRT rattaché à l’ARPT — République de Guinée',
  'Mission : prévention, détection, réponse et accompagnement du secteur',
  'Canal officiel de signalement avec prise en charge 24h/24',
  'Alignement sur les bonnes pratiques internationales (FIRST, CERT-FR, ENISA)',
  'Objectif : unifier vitrine institutionnelle et pilotage opérationnel'
) | Out-Null

# ========== SLIDE 4 — Architecture ==========
New-ContentSlide 'Architecture de la solution' @(
  'Face publique : information, sensibilisation et déclaration d’incidents',
  'Face privée (DG) : tableau de bord, gestion des incidents, administration',
  'CMS éditorial intégré : pages, menus, pied de page, médiathèque',
  'Socle technique moderne : Next.js + base de données Prisma',
  'Hébergement cible : csirt.arpt.gov.gn — canal HTTPS institutionnel'
) | Out-Null

# ========== SLIDE 5 — Parcours public ==========
New-ContentSlide 'Parcours citoyen & opérateurs' @(
  'Signaler un incident via le formulaire public sécurisé',
  'Suivre un dossier avec référence et statut de traitement',
  'S’abonner aux alertes et publications officielles (newsletter)',
  'Contacter le CSIRT (e-mail, téléphone, adresse, disponibilité)',
  'Assistant FAQ pour orienter rapidement les usagers'
) | Out-Null

# ========== SLIDE 6 — Contenu & veille ==========
New-ContentSlide 'Contenu, veille & sensibilisation' @(
  'Publications : actualités, rapports, guides, communiqués, médiathèque',
  'Veille vulnérabilités et panorama des menaces',
  'Réglementations : lois, décrets, cadres et normes (ex. RGSSI)',
  'Bonnes pratiques adaptées : particuliers, entreprises, institutions',
  'Collecte automatisée des sources de veille cyber'
) | Out-Null

# ========== SLIDE 7 — Accompagnements ==========
New-ContentSlide 'Accompagnements & écosystème' @(
  'Audit et diagnostic · Conseil · Assistance technique · Formations',
  'Espace RSSI et Espace de confiance',
  'Agréments et experts auditeurs certifiés',
  'Rubriques institutionnelles : missions, gouvernance, historique',
  'Une offre complète pour le secteur régulé et le public'
) | Out-Null

# ========== SLIDE 8 — Incidents ==========
New-ContentSlide 'Console : pilotage des incidents' @(
  'Centre de supervision avec indicateurs temps réel',
  'Qualification, assignation analyste et suivi du cycle de vie',
  'Notes d’investigation et notifications e-mail automatiques',
  'Réponse structurée au déclarant et traçabilité des actions',
  'Archivage / corbeille avec rétention maîtrisée'
) | Out-Null

# ========== SLIDE 9 — CMS ==========
New-ContentSlide 'Console : édition du site public' @(
  'Pilotage de la page d’accueil, des pages et des menus',
  'Pied de page : bandeau newsletter, marque, colonnes, mentions',
  'Newsletter : abonnés, campagnes, corbeille, pop-up',
  'Messages de contact et configuration de l’assistant FAQ',
  'Sources & historique de collecte pour la veille'
) | Out-Null

# ========== SLIDE 10 — Gouvernance ==========
New-ContentSlide 'Gouvernance & administration' @(
  'Gestion des utilisateurs (création, corbeille, import AD/LDAP)',
  'Rôles & permissions à grain fin (menus et actions)',
  'Référentiels métier : natures, organisations, thématiques…',
  'Paramètres institutionnels, SMTP et politiques de sécurité',
  'Journal d’audit : qui / quoi / quand / adresse IP'
) | Out-Null

# ========== SLIDE 11 — Sécurité ==========
New-ContentSlide 'Sécurité de la plateforme' @(
  'Authentification forte : mot de passe robuste + 2FA TOTP + WebAuthn',
  'Sessions courtes et mono-session par utilisateur',
  'Contrôle d’accès RBAC aligné sur la console DG',
  'Journal d’audit traçable (connexions, modifications, exports)',
  'Transport HTTPS et messagerie institutionnelle sécurisée'
) | Out-Null

# ========== SLIDE 12 — Bénéfices ==========
New-ContentSlide 'Bénéfices pour l’ARPT' @(
  'Un canal unique de signalement et de communication officielle',
  'Professionnalisation SOC / CERT : workflow de bout en bout',
  'Maîtrise éditoriale du site sans dépendance externe lourde',
  'Conformité opérationnelle : audit, rôles, politiques de session',
  'Image institutionnelle renforcée auprès du public et du secteur'
) | Out-Null

# ========== SLIDE 13 — Suite ==========
New-ContentSlide 'Prochaines étapes' @(
  'Mise en production sur csirt.arpt.gov.gn',
  'Paramétrage SMTP, annuaire AD/LDAP et 2FA obligatoire',
  'Formation des agents : console incidents + CMS',
  'Recette éditoriale et opérationnelle',
  'Calendrier de déploiement et points de décision'
) 'Feuille de route' | Out-Null

# ========== SLIDE 14 — Clôture ==========
$sLast = $pres.Slides.Add($pres.Slides.Count + 1, $ppLayoutBlank)
[void](Add-ShapeRect $sLast 0 0 1219.2 685.8 $cForest)
[void](Add-ShapeRect $sLast 0 0 1219.2 8 $cAccent)
Add-TextBox $sLast 60 180 1100 50 'Une plateforme unique' 28 $true $cWhite 2 | Out-Null
Add-TextBox $sLast 80 250 1060 90 "Vitrine institutionnelle  ·  Signalement 24h/24  ·  Console CERT sécurisée`rpour l’ARPT Guinée" 18 $false $cSoft 2 | Out-Null
Add-TextBox $sLast 60 400 1100 30 'Merci de votre attention' 26 $true $cWhite 2 | Out-Null
Add-TextBox $sLast 60 470 1100 28 'Questions & échanges' 16 $false (Rgb 168 201 184) 2 | Out-Null
Add-TextBox $sLast 60 560 1100 28 'csirt.arpt.gov.gn  ·  csirt@arpt.gov.gn  ·  (+224) 669 221 000' 13 $false $cSoft 2 | Out-Null

# Save
if (Test-Path $outputPath) { Remove-Item $outputPath -Force }
$pres.SaveAs($outputPath)
$pres.Close()
$ppt.Quit()

[System.Runtime.InteropServices.Marshal]::ReleaseComObject($pres) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
[GC]::Collect()
[GC]::WaitForPendingFinalizers()

Write-Output "OK:$outputPath"

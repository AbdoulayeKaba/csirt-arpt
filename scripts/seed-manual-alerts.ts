/**
 * Ajoute dix alertes saisies à la main par catégorie.
 * Le corps est du HTML simple, repris tel quel dans l’éditeur.
 * Elles restent masquées tant qu’un administrateur ne les affiche pas.
 *
 * Exécution : npx tsx scripts/seed-manual-alerts.ts
 */
import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { mergeSiteContent } from '../lib/site/merge'
import { resolveNewsTopics, type SiteNewsTopic } from '../lib/site/news-sources'
import { SITE_CONTENT_KEY } from '../lib/site/types'
import {
  getPlatformSettingValue,
  upsertPlatformSettingValue,
} from '../lib/services/platform-settings-store'

const PER_CATEGORY = 10
const ID_PREFIX = 'ncol-manuel-'

type Draft = {
  title: string
  lead: string
  context: string
  checks: [string, string, string]
  actions: [string, string, string]
}

const PACKS: Record<string, Draft[]> = {
  ALERTES_SECURITE: [
    draft(
      'Contrôler les comptes à privilèges après un changement d’administrateur',
      'Après un départ ou un changement de rôle, les accès d’administration doivent être revus le jour même.',
      'Un compte administrateur qui reste actif après un changement de fonction permet d’accéder aux systèmes sans contrôle. Cette note sert de base éditoriale pour une alerte interne.',
      ['Lister les comptes d’administration encore actifs.', 'Retirer les accès qui ne correspondent plus au poste.', 'Conserver la date et le nom de la personne qui a fait la revue.']
    ),
    draft(
      'Vérifier l’exposition des services accessibles depuis Internet',
      'Seuls les services qui doivent être joints de l’extérieur restent ouverts.',
      'Un service laissé exposé sans besoin métier élargit la surface à surveiller. Le texte peut être adapté au périmètre réel de l’organisation.',
      ['Recenser les services joignables depuis Internet.', 'Fermer ceux qui n’ont pas de justification écrite.', 'Noter le responsable de chaque service laissé ouvert.']
    ),
    draft(
      'Limiter les pièces jointes exécutables reçues par messagerie',
      'Les fichiers exécutables reçus par courriel ne doivent pas être ouverts depuis la boîte de réception.',
      'La messagerie reste un point d’entrée courant. Cette alerte rappelle le réflexe attendu avant toute ouverture de pièce jointe.',
      ['Bloquer ou mettre en quarantaine les pièces exécutables.', 'Prévoir une consigne simple pour les correspondants.', 'Indiquer à qui signaler un message douteux.']
    ),
    draft(
      'Revoir les règles de pare-feu ouvertes sans échéance',
      'Une règle d’ouverture doit avoir un motif, un responsable et une date de revue.',
      'Les ouvertures temporaires deviennent permanentes lorsqu’elles ne sont pas datées. Le texte est prêt à être précisé avec les équipements concernés.',
      ['Identifier les règles sans date de fin.', 'Demander au responsable si l’ouverture est encore nécessaire.', 'Fermer ou renouveler explicitement chaque règle.']
    ),
    draft(
      'Surveiller les connexions d’administration en dehors des horaires habituels',
      'Une connexion d’administration à une heure inhabituelle doit pouvoir être expliquée.',
      'Le suivi des horaires ne remplace pas l’analyse, mais il permet de repérer un accès qui mérite une vérification.',
      ['Définir la plage horaire normale d’administration.', 'Relever les connexions en dehors de cette plage.', 'Contacter le titulaire du compte avant toute conclusion.']
    ),
    draft(
      'Désactiver les comptes de correspondant devenus inutiles',
      'Un compte de correspondant inactif ne doit plus permettre de déposer un signalement.',
      'Le départ d’un correspondant ou la fin de sa mission doit se traduire par une désactivation, selon la règle de validation en vigueur.',
      ['Repérer les comptes sans connexion récente.', 'Confirmer avec l’organisation que le compte n’est plus nécessaire.', 'Désactiver le compte et noter la date.']
    ),
    draft(
      'Confirmer qu’une sauvegarde récente peut être restaurée',
      'Une sauvegarde n’est utile que si une restauration a déjà été essayée.',
      'Cette note rappelle de vérifier la copie la plus récente des systèmes critiques, sans attendre un incident.',
      ['Identifier la dernière sauvegarde des systèmes essentiels.', 'Vérifier qu’elle est conservée hors du système protégé.', 'Noter le résultat du dernier essai de restauration.']
    ),
    draft(
      'Examiner une série de connexions refusées sur un même compte',
      'Plusieurs échecs rapprochés sur un compte méritent une vérification auprès du titulaire.',
      'Le volume seul ne prouve pas une attaque. L’alerte sert à déclencher une vérification humaine.',
      ['Relever le compte, l’heure et l’origine si elle est connue.', 'Demander au titulaire s’il est à l’origine des essais.', 'Réinitialiser l’accès seulement si le titulaire ne reconnaît pas les essais.']
    ),
    draft(
      'Isoler un poste dont le comportement n’est plus celui attendu',
      'Un poste qui chiffre des fichiers ou contacte des destinations inconnues doit être séparé du réseau.',
      'L’isolement est une mesure de précaution. Le texte peut être complété avec la procédure interne du CSIRT.',
      ['Débrancher le poste du réseau sans l’éteindre si l’analyse doit continuer.', 'Noter l’heure et la personne qui a constaté le comportement.', 'Ouvrir un signalement avec les faits observés, sans interprétation définitive.']
    ),
    draft(
      'Rappeler comment déposer un signalement auprès du CSIRT',
      'Le canal officiel de signalement doit être connu des correspondants avant qu’un incident se produise.',
      'Cette alerte peut être publiée telle quelle ou adaptée avec les coordonnées déjà présentes sur le site.',
      ['Indiquer le formulaire de signalement du site public.', 'Rappeler le numéro officiel du CSIRT.', 'Préciser les informations utiles : heure, système concerné, ce qui a été observé.']
    ),
  ],
  MENACES_INCIDENTS: [
    draft(
      'Qualifier un signalement reçu d’un correspondant',
      'Chaque signalement reçoit une première lecture : faits, système concerné et heure.',
      'La qualification ne conclut pas tout de suite. Elle sépare ce qui est observé de ce qui reste à vérifier.',
      ['Relire le message du correspondant sans le modifier.', 'Noter ce qui est certain et ce qui manque.', 'Répondre au correspondant pour accuser réception.']
    ),
    draft(
      'Établir la chronologie d’un incident de messagerie',
      'La chronologie commence à l’heure du premier message signalé et s’arrête au retour à la normale.',
      'Un récit daté évite de mélanger les faits et les hypothèses dans le compte rendu.',
      ['Placer les événements dans l’ordre des heures.', 'Citer la source de chaque heure retenue.', 'Laisser vides les heures qui ne sont pas encore connues.']
    ),
    draft(
      'Distinguer une panne technique d’un acte malveillant',
      'Une indisponibilité n’est pas, à elle seule, la preuve d’un acte malveillant.',
      'Cette note aide à formuler ce qui a été écarté et ce qui reste ouvert.',
      ['Décrire le symptôme observé.', 'Noter les vérifications techniques déjà faites.', 'Écrire clairement si la cause n’est pas encore établie.']
    ),
    draft(
      'Préparer le compte rendu d’un incident clos',
      'Le compte rendu rappelle les faits, les mesures prises et ce qui reste à améliorer.',
      'Il est destiné à l’équipe et, si besoin, à l’organisation concernée. Le texte se réécrit selon le cas réel.',
      ['Résumer les faits en quelques phrases.', 'Lister les mesures réellement appliquées.', 'Indiquer une seule action de suivi, avec un responsable.']
    ),
    draft(
      'Identifier les systèmes concernés avant toute correction',
      'La liste des systèmes touchés précède les changements de configuration.',
      'Corriger trop tôt peut effacer les éléments utiles à la compréhension de l’incident.',
      ['Nommer chaque système avec son rôle.', 'Noter s’il est encore en service.', 'Différer les changements qui ne sont pas nécessaires pour limiter l’impact.']
    ),
    draft(
      'Conserver les journaux utiles à l’analyse',
      'Les journaux de la période concernée sont copiés avant toute rotation.',
      'Sans copie, la rotation automatique peut effacer la période à étudier.',
      ['Délimiter la période à conserver.', 'Copier les journaux hors du système concerné.', 'Noter qui a fait la copie et à quelle heure.']
    ),
    draft(
      'Informer le déclarant pendant l’examen du signalement',
      'Le correspondant qui a signalé l’incident reçoit un point d’étape, même bref.',
      'Le message indique l’état du traitement, pas une conclusion prématurée.',
      ['Accuser réception si ce n’est pas déjà fait.', 'Dire ce qui est en cours de vérification.', 'Éviter d’annoncer une cause qui n’est pas établie.']
    ),
    draft(
      'Évaluer l’effet sur les services proposés au public',
      'L’impact se décrit par les services interrompus et les personnes concernées.',
      'Cette évaluation sert à prioriser le traitement. Elle peut être corrigée lorsque de nouveaux faits arrivent.',
      ['Lister les services publics touchés.', 'Indiquer si des données de personnes sont en jeu.', 'Réviser l’évaluation dès qu’un fait nouveau est confirmé.']
    ),
    draft(
      'Clôturer un incident après le retour à la normale',
      'La clôture intervient lorsque le service est rétabli et que les mesures prévues sont faites.',
      'Clôturer n’efface pas le dossier. Le compte rendu reste disponible pour l’équipe.',
      ['Vérifier le retour du service avec le déclarant.', 'Confirmer que les mesures décidées sont appliquées.', 'Enregistrer la date de clôture.']
    ),
    draft(
      'Partager un enseignement utile aux organisations partenaires',
      'Un enseignement se limite aux faits réutilisables, sans détail inutile sur l’organisation touchée.',
      'Le texte peut devenir un bulletin une fois relu. Il ne nomme pas une organisation sans accord.',
      ['Retenir un seul enseignement actionnable.', 'Retirer les noms et les identifiants internes.', 'Faire relire le texte avant tout envoi.']
    ),
  ],
  AVIS_SECURITE: [
    draft(
      'Appliquer les correctifs des accès distants',
      'Les équipements qui permettent un accès distant sont mis à jour en priorité.',
      'Un avis de ce type rappelle le correctif, le périmètre et la fenêtre de maintenance. Les références précises se complètent dans l’éditeur.',
      ['Identifier les équipements d’accès distant.', 'Vérifier la version actuellement installée.', 'Planifier la mise à jour avec un retour arrière possible.']
    ),
    draft(
      'Mettre à jour les navigateurs des postes d’administration',
      'Le navigateur utilisé pour l’administration doit être celui pris en charge par l’éditeur.',
      'Cette note se complète avec la version attendue au moment de la publication.',
      ['Relever la version installée sur les postes d’administration.', 'Comparer avec la version prise en charge.', 'Planifier la mise à jour des postes en écart.']
    ),
    draft(
      'Vérifier la version du service de messagerie',
      'Le service de messagerie est concerné dès qu’un avis porte sur son logiciel.',
      'L’avis reste général tant que la version et l’éditeur ne sont pas précisés dans le texte.',
      ['Noter la version en production.', 'Lire l’avis de l’éditeur avant de conclure.', 'Prévoir un essai sur un environnement de recette si l’organisation en dispose.']
    ),
    draft(
      'Retirer un composant dont l’éditeur a cessé le support',
      'Un composant sans support ne reçoit plus de correctifs.',
      'Le retrait ou le remplacement se décide avec le responsable du service, pas dans l’urgence sans solution de repli.',
      ['Nommer le composant et sa date de fin de support.', 'Identifier les services qui en dépendent.', 'Proposer une échéance de remplacement.']
    ),
    draft(
      'Contrôler les mises à jour des équipements réseau',
      'Les commutateurs, pare-feu et bornes suivent le même principe : version connue, correctif planifié.',
      'Le texte peut citer ensuite les modèles réellement déployés.',
      ['Tenir une liste des versions installées.', 'Repérer les équipements en retard de correctif.', 'Grouper les mises à jour par fenêtre de maintenance.']
    ),
    draft(
      'Changer les mots de passe livrés avec un nouveau matériel',
      'Le mot de passe d’usine est remplacé avant la mise en service.',
      'Cette consigne s’applique au matériel neuf comme au matériel réinstallé.',
      ['Repérer les équipements encore configurés avec le mot de passe d’usine.', 'Le remplacer par un secret propre à l’organisation.', 'Consigner le changement sans écrire le secret dans l’avis.']
    ),
    draft(
      'Limiter les extensions installées sur les postes',
      'Seules les extensions nécessaires au travail restent installées.',
      'Une extension inconnue élargit ce que le navigateur peut exécuter. L’avis peut citer la liste autorisée de l’organisation.',
      ['Recenser les extensions présentes.', 'Retirer celles qui ne sont pas autorisées.', 'Indiquer à qui demander une exception.']
    ),
    draft(
      'Planifier une fenêtre pour un correctif prioritaire',
      'Un correctif prioritaire a une date, un responsable et un moyen de revenir en arrière.',
      'L’avis public peut rester court. Le détail de la fenêtre se tient dans la procédure interne.',
      ['Choisir une date de maintenance.', 'Prévenir les équipes concernées.', 'Prévoir la vérification du service après la mise à jour.']
    ),
    draft(
      'Vérifier les sauvegardes avant une mise à jour majeure',
      'Une mise à jour majeure est précédée d’une sauvegarde dont la restauration est connue.',
      'Cette précaution évite de découvrir pendant l’incident que la copie n’est pas utilisable.',
      ['Contrôler la sauvegarde la plus récente.', 'Confirmer qu’un essai de restauration a déjà réussi.', 'Reporter la mise à jour si la copie n’est pas fiable.']
    ),
    draft(
      'Informer les correspondants concernés par un correctif',
      'Lorsqu’un correctif touche le périmètre d’une organisation partenaire, le correspondant en est informé.',
      'Le message indique le produit, la version et la mesure attendue, sans détail inutile.',
      ['Identifier les organisations concernées.', 'Rédiger un message court et daté.', 'Conserver la trace de l’envoi.']
    ),
  ],
  IOC: [
    draft(
      'Rechercher une adresse de messagerie signalée dans les journaux',
      'L’adresse est recherchée sur la période indiquée, puis le résultat est noté.',
      'Un indicateur n’a de valeur que si la recherche et son résultat sont datés.',
      ['Noter l’adresse exacte à rechercher.', 'Limiter la recherche à la période reçue.', 'Écrire si aucune trace n’a été trouvée.']
    ),
    draft(
      'Surveiller un nom de domaine remis par un partenaire',
      'Le domaine est ajouté à la liste de surveillance avec sa date de réception.',
      'Le texte de l’indicateur se complète dans l’éditeur avec la valeur exacte, sans la diffuser plus largement que nécessaire.',
      ['Enregistrer le domaine et la date de réception.', 'Préciser qui l’a transmis.', 'Retirer l’indicateur lorsqu’il n’est plus pertinent.']
    ),
    draft(
      'Consigner l’empreinte d’un fichier reçu pour analyse',
      'L’empreinte est conservée avec le nom du fichier et la date.',
      'L’empreinte permet une recherche ultérieure. Elle ne remplace pas l’analyse du fichier.',
      ['Noter le nom du fichier et l’empreinte reçue.', 'Indiquer l’outil qui a calculé l’empreinte.', 'Limiter l’accès à cette note aux personnes chargées de l’analyse.']
    ),
    draft(
      'Croiser un indicateur avec les journaux du pare-feu',
      'La recherche sur le pare-feu porte sur la période et la valeur reçues.',
      'Le résultat, y compris l’absence de trace, est écrit dans la note.',
      ['Reprendre la valeur sans la modifier.', 'Chercher sur la période convenue.', 'Conserver le résultat de la recherche.']
    ),
    draft(
      'Écarter un indicateur qui ne concerne pas le système d’information',
      'Un indicateur hors périmètre est écarté, avec le motif.',
      'Écarter n’est pas ignorer : le motif reste lisible pour une relecture.',
      ['Comparer l’indicateur au périmètre de l’organisation.', 'Écrire pourquoi il ne s’applique pas.', 'Conserver la note plutôt que de l’effacer.']
    ),
    draft(
      'Dater la période de recherche d’un indicateur',
      'Toute recherche indique le début et la fin de la période examinée.',
      'Sans période, le résultat ne peut pas être repris plus tard.',
      ['Fixer l’heure de début.', 'Fixer l’heure de fin.', 'Nommer la personne qui a fait la recherche.']
    ),
    draft(
      'Transmettre un indicateur qualifié aux correspondants concernés',
      'Seuls les correspondants dont le périmètre est concerné reçoivent l’indicateur.',
      'Le message indique la valeur, la période et la mesure attendue.',
      ['Vérifier que l’indicateur a été qualifié.', 'Limiter les destinataires.', 'Garder une copie du message envoyé.']
    ),
    draft(
      'Archiver l’origine interne d’un indicateur',
      'On note qui a fourni l’indicateur et dans quel dossier il est rangé.',
      'L’origine permet de revenir vers la personne si la valeur doit être précisée.',
      ['Nommer la source interne.', 'Indiquer le dossier de rattachement.', 'Éviter de recopier des données personnelles inutiles.']
    ),
    draft(
      'Relancer une recherche après avoir élargi la période',
      'Si la première recherche ne montre rien, la période peut être élargie une fois.',
      'La seconde recherche est datée séparément de la première.',
      ['Conserver le résultat de la première recherche.', 'Définir la nouvelle période.', 'Écrire le second résultat sans effacer le premier.']
    ),
    draft(
      'Retirer un indicateur qui n’est plus d’actualité',
      'Un indicateur périmé sort de la liste active, avec la date de retrait.',
      'Le retrait évite des recherches inutiles. L’historique reste consultable.',
      ['Vérifier que l’indicateur n’est plus pertinent.', 'Noter la date de retrait.', 'Informer les personnes qui le surveillaient encore.']
    ),
  ],
  DURCISSEMENT: [
    draft(
      'Exiger une seconde vérification pour les accès d’administration',
      'L’accès d’administration ne repose pas sur le seul mot de passe.',
      'La seconde vérification se met en place d’abord pour les comptes qui peuvent modifier les systèmes.',
      ['Lister les comptes d’administration.', 'Activer la seconde vérification sur ces comptes.', 'Prévoir un moyen de secours connu de l’équipe.']
    ),
    draft(
      'Séparer le compte du quotidien et le compte d’administration',
      'Le travail courant et l’administration ne s’effectuent pas avec le même compte.',
      'La séparation limite ce qu’un usage quotidien peut modifier par erreur.',
      ['Créer un compte d’administration distinct.', 'Retirer les droits d’administration du compte quotidien.', 'Vérifier que le compte d’administration n’est pas utilisé pour la messagerie courante.']
    ),
    draft(
      'Réduire les droits d’écriture sur les dossiers partagés',
      'L’écriture est limitée aux personnes qui doivent modifier les documents.',
      'Un droit d’écriture trop large facilite un changement non souhaité.',
      ['Revoir les groupes qui peuvent écrire.', 'Passer en lecture seule les accès qui ne sont plus justifiés.', 'Noter la date de la revue.']
    ),
    draft(
      'Chiffrer les postes qui sortent des locaux',
      'Un poste nomade est chiffré avant d’être confié à son utilisateur.',
      'Le chiffrement protège les documents si le poste est perdu.',
      ['Repérer les postes utilisés hors des locaux.', 'Vérifier que le chiffrement est actif.', 'Remettre une consigne en cas de perte.']
    ),
    draft(
      'Désactiver les services réseau qui ne servent plus',
      'Un service sans usage identifié est arrêté.',
      'Moins de services ouverts, moins de points à surveiller.',
      ['Lister les services à l’écoute.', 'Demander si chacun a encore un usage.', 'Arrêter et désactiver ceux qui n’en ont plus.']
    ),
    draft(
      'Journaliser les connexions d’administration',
      'Chaque connexion d’administration laisse une trace : compte, heure, système.',
      'La journalisation sert à comprendre un accès, pas à surveiller l’activité courante des agents.',
      ['Activer la trace des connexions d’administration.', 'Définir combien de temps ces traces sont conservées.', 'Limiter leur lecture aux personnes chargées de l’analyse.']
    ),
    draft(
      'Limiter la durée d’une session sur une application sensible',
      'Une session inactive se ferme après un délai défini.',
      'Le délai se choisit avec les équipes qui utilisent l’application.',
      ['Fixer le délai de fermeture.', 'L’appliquer d’abord sur les applications les plus sensibles.', 'Informer les utilisateurs du nouveau délai.']
    ),
    draft(
      'Revoir les droits des comptes de service',
      'Un compte de service ne dispose que des droits nécessaires à sa tâche.',
      'Ces comptes sont souvent oubliés lors des revues de personnel.',
      ['Lister les comptes de service.', 'Comparer leurs droits à la tâche réelle.', 'Retirer les droits en trop.']
    ),
    draft(
      'Documenter la configuration de référence d’un serveur',
      'La configuration attendue est écrite et datée.',
      'Le document permet de voir un écart lors d’un contrôle.',
      ['Décrire les services qui doivent être actifs.', 'Décrire les accès autorisés.', 'Dater le document et nommer son responsable.']
    ),
    draft(
      'Essayer une restauration de sauvegarde chaque trimestre',
      'Un essai de restauration est planifié, réalisé et noté.',
      'L’essai porte sur un jeu de données représentatif, pas nécessairement sur tout le système.',
      ['Choisir le jeu de données à restaurer.', 'Réaliser l’essai hors de la production.', 'Écrire le résultat et la date.']
    ),
  ],
  BULLETINS: [
    draft(
      'Point sur les signalements reçus des correspondants',
      'Le bulletin résume le nombre de signalements traités et les sujets qui reviennent.',
      'Les chiffres utilisés sont ceux du registre réel. Ce texte est une trame à compléter.',
      ['Reprendre les signalements de la période.', 'Regrouper les sujets récurrents.', 'Ne citer une organisation que si elle a donné son accord.']
    ),
    draft(
      'Rappel des réflexes avant une période de congés',
      'Avant une absence, les astreintes et les comptes utiles sont confirmés.',
      'Le bulletin se publie avant la période concernée, avec les noms des personnes joignables.',
      ['Vérifier qui est joignable.', 'Confirmer le canal de signalement.', 'Rappeler de ne pas laisser une session d’administration ouverte.']
    ),
    draft(
      'Synthèse des demandes d’accompagnement du mois',
      'Les demandes reçues sont résumées par thème, sans détail nominatif.',
      'La synthèse montre les sujets sur lesquels les organisations ont besoin d’un appui.',
      ['Classer les demandes par thème.', 'Retirer les noms des personnes.', 'Proposer un seul sujet à approfondir le mois suivant.']
    ),
    draft(
      'Accueil des nouveaux correspondants',
      'Un nouveau correspondant reçoit le canal de signalement et le délai de prise en compte.',
      'Le bulletin peut accompagner l’ouverture du compte.',
      ['Indiquer comment déposer un signalement.', 'Indiquer qui contacter en cas de difficulté de connexion.', 'Rappeler que le compte est personnel.']
    ),
    draft(
      'Retour sur les essais de restauration',
      'Le bulletin indique si les essais prévus ont été faits et ce qui doit être corrigé.',
      'On ne publie pas le détail technique des copies.',
      ['Dire si l’essai a réussi.', 'Indiquer la correction prévue en cas d’échec.', 'Donner la date du prochain essai.']
    ),
    draft(
      'Horaires de joignabilité du CSIRT',
      'Les horaires et le numéro officiel sont rappelés aux correspondants.',
      'Le numéro publié est celui déjà utilisé par l’institution, sans en inventer un autre.',
      ['Reprendre les horaires en vigueur.', 'Reprendre le numéro officiel.', 'Indiquer le formulaire du site pour un signalement écrit.']
    ),
    draft(
      'Rappel du canal officiel de signalement',
      'Un signalement se dépose sur le formulaire du site, par le correspondant habilité.',
      'Le bulletin évite de multiplier les adresses non officielles.',
      ['Citer l’adresse du formulaire.', 'Rappeler qu’un compte correspondant est nécessaire.', 'Indiquer les éléments utiles à joindre au message.']
    ),
    draft(
      'Retour d’une campagne de mises à jour',
      'La campagne est résumée : périmètre, taux d’avancement, ce qui reste à faire.',
      'Les chiffres viennent du suivi réel de la campagne.',
      ['Décrire le périmètre concerné.', 'Indiquer ce qui est terminé.', 'Indiquer ce qui reste ouvert et qui en est responsable.']
    ),
    draft(
      'Présentation des rubriques publiées sur le site',
      'Le bulletin explique à quoi sert chaque rubrique d’alertes du site public.',
      'Il aide les correspondants à lire la bonne rubrique.',
      ['Citer les rubriques actives.', 'Dire en une phrase ce que chacune contient.', 'Renvoyer vers la page Actualités.']
    ),
    draft(
      'Calendrier des actions de durcissement du trimestre',
      'Trois actions maximum sont annoncées, avec une échéance chacune.',
      'Le calendrier reste réaliste. Une action non tenue est expliquée dans le bulletin suivant.',
      ['Choisir trois actions.', 'Leur donner une échéance.', 'Nommer l’équipe qui en répond.']
    ),
  ],
}

function draft(
  title: string,
  lead: string,
  context: string,
  lines: [string, string, string]
): Draft {
  return {
    title,
    lead,
    context,
    checks: lines,
    actions: [
      'Relire le texte et l’adapter au cas réel avant toute publication.',
      'Compléter les dates, versions ou périmètres qui manquent.',
      'Afficher l’alerte sur le site seulement après cette relecture.',
    ],
  }
}

function bodyHtml(item: Draft) {
  const checks = item.checks.map((line) => `<li>${line}</li>`).join('')
  const actions = item.actions.map((line) => `<li>${line}</li>`).join('')
  return [
    '<h2>Contexte</h2>',
    `<p>${item.context}</p>`,
    '<h2>Points à vérifier</h2>',
    `<ul>${checks}</ul>`,
    '<h2>Suite à donner</h2>',
    `<ol>${actions}</ol>`,
  ].join('')
}

function day(offset: number) {
  const date = new Date(Date.UTC(2026, 9, 7))
  date.setUTCDate(date.getUTCDate() - offset)
  return date.toISOString().slice(0, 10)
}

function fallbackPack(topic: SiteNewsTopic): Draft[] {
  return Array.from({ length: PER_CATEGORY }, (_, index) =>
    draft(
      `${topic.label} — note éditoriale ${index + 1}`,
      `Texte de travail pour la rubrique « ${topic.label} ». Il se réécrit avant publication.`,
      `Cette note appartient à la rubrique ${topic.label}. Le titre, le chapô et les paragraphes sont modifiables dans l’éditeur.`,
      [
        'Préciser le périmètre concerné.',
        'Ajouter les faits vérifiés.',
        'Retirer ce qui ne doit pas être publié.',
      ]
    )
  )
}

async function main() {
  const raw = await getPlatformSettingValue(SITE_CONTENT_KEY)
  if (!raw) throw new Error('SITE_CONTENT_MISSING')
  const site = mergeSiteContent(JSON.parse(raw) as unknown)
  const topics = resolveNewsTopics(site.newsTopics)
  if (topics.length === 0) throw new Error('NO_TOPIC')

  const kept = site.newsCollected.filter((item) => !item.id.startsWith(ID_PREFIX))
  const created = topics.flatMap((topic, topicIndex) => {
    const pack = PACKS[topic.id] ?? fallbackPack(topic)
    return pack.slice(0, PER_CATEGORY).map((item, index) => {
      const id = `${ID_PREFIX}${topic.id}-${String(index + 1).padStart(2, '0')}`
      const date = day(topicIndex * PER_CATEGORY + index)
      return {
        id,
        title: item.title,
        excerpt: item.lead,
        bodyHtml: bodyHtml(item),
        author: 'CSIRT-ARPT',
        url: `/actualites/${id}`,
        sourceId: 'manual',
        sourceName: 'Saisie manuelle',
        category: topic.id,
        themes: [topic.label],
        date,
        scrapedAt: `${date}T08:00:00.000Z`,
        enabled: false,
        enabledAt: null,
        archived: false,
        archivedAt: null,
      }
    })
  })

  const saved = await upsertPlatformSettingValue(
    SITE_CONTENT_KEY,
    JSON.stringify({ ...site, newsCollected: [...created, ...kept], updatedAt: new Date().toISOString() })
  )
  if (!saved) throw new Error('SITE_SAVE_FAILED')

  const counts = new Map<string, number>()
  for (const item of created) counts.set(item.category, (counts.get(item.category) ?? 0) + 1)
  for (const topic of topics) {
    console.log(`${topic.label}: ${counts.get(topic.id) ?? 0}`)
  }
  console.log(`total manuel: ${created.length}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

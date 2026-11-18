# Spécification de Sécurité Firestore — Eradiz

## 1. Invariants de données
1. **Isolation stricte des PII (`/users/{userId}`)** : Seul le propriétaire authentifié (`request.auth.uid == userId`) peut lire (`get`) ou modifier son propre document utilisateur. Aucun utilisateur ne peut lister (`list`) la collection `users`.
2. **Protection anti-abus des crédits gratuits** : À la création d'un document `users/{userId}`, `credits` doit être un entier strictement égal à `5` et `createdAt == request.time`.
3. **Immutabilité des champs critiques** : `email` et `createdAt` sont immuables après création.
4. **Intégrité des mises à jour de crédits** : Les mises à jour du solde doivent rester bornées (`credits >= 0`), n'affecter que les champs autorisés (`credits`, `activePlan`, `displayName`, `updatedAt`), et respecter les limites de taille des chaînes.
5. **Validation des identifiants** : Tout `userId` et `usageId` doit correspondre au motif `^[a-zA-Z0-9_\-]+$` et mesurer au plus 128 caractères.
6. **Journal d'utilisation immuable (`/users/{userId}/usages/{usageId}`)** : Seul le propriétaire authentifié dont le document parent `/users/{userId}` existe peut lire ou créer un enregistrement d'utilisation (`ai_studio_kit`, `video_export`, `image_export`, `calculator_session`). Les champs `userId == request.auth.uid`, `createdAt == request.time` et les longueurs maximales (`title <= 120`, `details <= 200`) sont strictement validés ; toute modification ou suppression côté client est interdite.
7. **Galerie des créations (`/users/{userId}/creations/{creationId}`)** : Seul le propriétaire authentifié dont le document parent `/users/{userId}` existe peut lire, lister, créer ou supprimer ses propres créations sauvegardées. Tous les champs requis, la couleur hexadécimale `themeColor`, le booléen `isCutout`, les bornes de taille des chaînes/aperçus et `createdAt == request.time` sont strictement validés ; les mises à jour (`update`) sont interdites.

## 2. Payloads malveillants (« Dirty Dozen ») devant être rejetés (`PERMISSION_DENIED`)
1. Lecture (`get`) de `/users/autreUid` par un utilisateur non propriétaire.
2. Requête `list` sur `/users` par un utilisateur connecté.
3. Création de `/users/{uid}` sans authentification (`request.auth == null`).
4. Création de `/users/{uid}` avec `credits: 9999` (contournement du quota initial de 5 crédits).
5. Création de `/users/{uid}` avec un champ fantôme `isAdmin: true` ou `role: "admin"` (« Shadow Write »).
6. Création de `/users/{uid}` avec un `email` usurpé différent du jeton authentifié.
7. Création de `/users/{uid}` avec un `createdAt` falsifié dans le passé (non égal à `request.time`).
8. Création de `/users/{uid}` avec un `displayName` géant (> 120 caractères).
9. Mise à jour de `/users/{uid}` modifiant le champ immuable `createdAt` ou `email`.
10. Mise à jour de `/users/{uid}` tentant de passer `credits` en nombre négatif (`-5`) ou non entier (`3.5`).
11. Mise à jour de `/users/{uid}` tentant d'ajouter un champ non autorisé `bonusMultiplier: 10`.
12. Suppression (`delete`) d'un document `/users/{uid}` par le client pour recréer un compte avec 5 nouveaux crédits gratuits.
13. Création d'un document dans `/users/{uid}/usages/{usageId}` avec un `actionType` invalide, un `userId` usurpé ou un champ fantôme.
14. Modification (`update`) ou suppression (`delete`) d'un enregistrement dans `/users/{uid}/usages/{usageId}`.
15. Lecture ou création dans `/users/{autreUid}/creations/{creationId}` par un utilisateur non propriétaire, ou payload dépassant les limites de taille / contenant des champs non autorisés.



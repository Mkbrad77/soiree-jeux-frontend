# Soirée Jeux – Frontend

Application Angular pour organiser une soirée jeux : configuration des joueurs, équipes, jeux, classement et podium.

## Stack

- Angular 21, TypeScript 5.9, Angular Material  
- RxJS, standalone components  

## Lancer en local

```bash
npm install
npm start
```

Ouvre http://localhost:4200. Le backend doit tourner sur http://localhost:8080 (voir repo `soiree-jeux-backend`).

## Build production

```bash
npm run build
```

Sortie dans `dist/soiree-jeux-frontend/browser`. L’URL de l’API est configurée via `src/environments/environment.prod.ts` (ou variable d’environnement au build).

## Déploiement (Vercel)

Config dans `vercel.json`. Renseigner l’URL du backend dans `environment.prod.ts` avant le build.

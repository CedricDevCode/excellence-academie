# gstack — plan-ceo-review

Source : https://github.com/garrytan/gstack/blob/main/plan-ceo-review/SKILL.md
Installée le 2026-11-17 dans ce projet (clone git impossible — réseau sortant bloqué — donc récupérée via raw.githubusercontent.com).

## Statut de fonctionnement

La skill gstack complète attend le runtime gstack (`~/.claude/skills/gstack/bin/*` :
gstack-skill-start, gstack-skill-end, gstack-slug, gstack-paths, telemetry, preamble, AskUserQuestion transport…).
Ces binaires **ne sont pas disponibles sur cette machine** (le clone de garrytan/gstack est refusé, "Failed to connect to github.com").

Conséquence : la skill s'exécute ici en **mode dégradé** — les règles AskUserQuestion / telemetry / gstack-brain ne sont pas exécutables. Le contenu méthodologique (mise en récit "Mega Plan Review Mode", Step 0, Premise Challenge, alternatives, expansion scope, etc.) reste exploitable manuellement.

Si tu veux l'installation complète un jour : `git clone https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && ~/.claude/skills/gstack/setup` depuis une machine avec accès GitHub, puis `./setup` dans le dossier cloné.

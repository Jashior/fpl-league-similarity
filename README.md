# FPL League Similarity

https://fpl-league-similarity.zanaris.dev/

## Overview

Group Fantasy Premier League (FPL) managers based on their team compositions. It visually represents the differences in team selections, helping users understand the strategies and choices made by different managers.

Employs embedding techniques (t-SNE) to transform complex team data into a lower-dimensional space. The use of weighted vectors ensures that the representation captures important aspects of team composition: player prices, captains, vice-captains, benching. 

--- 

Teams are grouped together only if their "team vector" is identical. This vector
is based on more than just the 15 players on the team. Here's what makes two
teams different in the analysis, even if they have the same 15 players:

* Captaincy: If the two teams have a different captain, their vectors will be
    different.
* Starting XI vs. Bench: The players in the starting lineup are weighted more
    heavily than players on the bench. So, if two teams have the same 15 players
    but have swapped a starter and a benched player, they will be in different
    groups.
* Active Chip: Using a chip like "Bench Boost" or "Triple Captain" changes the
    weighting of players and will result in a different vector.

So, for two teams to be in the same group, they need to have the exact same 15
players, the same captain, the same starting lineup, and the same active chip
for that gameweek.

## Visual Grouping

![sim1](https://github.com/user-attachments/assets/dfd62496-2ce6-4d55-a2d1-8d9ebee9748d)

<!-- ## Point Distribution -->

<!-- ![sim2](https://github.com/user-attachments/assets/ed773d88-867d-4cd9-91f4-cab71e91e91c) -->

## Features

- **Manager Grouping**: Automatically groups FPL managers according to their team composition.
- **Graphical Representation**: Provides visual insights into the similarities and differences between teams, highlighting key player selections and overall strategies.
- **Interactive Interface**: Users can easily interact with the data, filtering and exploring different team compositions.
- **Search Functionality**: Quickly search for specific managers or players to see how they compare against others.
<!-- - **Points Distribution**: Display distribution of points for a given gameweek -->



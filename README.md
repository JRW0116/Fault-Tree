# Fault Tree Analysis Tool

A lightweight browser-based fault tree analysis application you can host directly from a GitHub repository or GitHub Pages.

## Features

- Create basic events and logical gates
- Connect nodes into a fault tree structure
- Select a top event and calculate its probability
- Generate minimal cut sets
- Import and export projects as JSON
- Host as a static site with no backend

## Hosting on GitHub

1. Create a new GitHub repository.
2. Upload the files in this folder.
3. Enable GitHub Pages for the repository.
4. Serve from the default branch root.

After Pages is enabled, the app will run as a static website.

## Local use

Open `index.html` in a browser, or serve the folder with any simple static file server.

## Project structure

- `index.html` contains the app layout
- `styles.css` contains the visual design and responsive styles
- `app.js` contains the editor, analysis logic, and import/export behavior

## Analysis assumptions

- Basic event probabilities are treated as independent.
- `AND` gates multiply child probabilities.
- `OR` gates use the complement rule: `1 - product(1 - p_i)`.
- Minimal cut sets are generated from the logical structure and deduplicated.

## Next ideas

- Add reusable event libraries
- Add importance measures and sensitivity analysis
- Add diagram export
- Add user authentication if you later want shared projects

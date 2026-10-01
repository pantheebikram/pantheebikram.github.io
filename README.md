# pantheebikram.github.io

Personal academic + industry website for **Bikram Panthee** (PhD researcher, Electrical Engineering, University of Vermont).
Plain HTML/CSS/JS with no build step, ready for GitHub Pages.

## Structure
```
index.html            all page content (About, Research, Lab, Experience, News, Contact)
css/style.css         theme (light/dark tokens at the top)
js/publications.js    publication list  ← add new papers here
js/main.js            theme toggle, nav, publications rendering, hero animation
js/bnb.js             interactive spatial branch-and-bound demo
js/feeder.js          interactive grid-aware EV charging demo (LinDistFlow)
assets/               favicon; put profile.jpg and Bikram_Panthee_CV.pdf here
404.html              custom "infeasible" 404 page
```

## Before publishing: fill these in
- [ ] `assets/profile.jpg`: square headshot (≈600×600). Until then a "BP" monogram shows.
- [ ] `assets/Bikram_Panthee_CV.pdf`: the "Download CV" button stays hidden until this file exists.
- [x] GitHub profile link (github.com/pantheebikram).
- [ ] Experience/Education entries marked as placeholders (search `timeline__todo` in `index.html`):
      bachelor's degree + university, and any pre-PhD / internship roles.
- [ ] Verify the **Tools** chips (Python, Julia/JuMP, Gurobi, MATLAB, OpenDSS) and the **News** dates match reality.

## Deploy on GitHub Pages
1. Create a repo named **`<your-github-username>.github.io`** (public).
2. From this folder:
   ```bash
   git init && git add . && git commit -m "Personal website"
   git branch -M main
   git remote add origin https://github.com/<your-github-username>/<your-github-username>.github.io.git
   git push -u origin main
   ```
3. Repo → **Settings → Pages** → Source: *Deploy from a branch*, Branch: `main` / `(root)`.
4. Live in ~1 minute at `https://<your-github-username>.github.io`.

## Preview locally
```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
Deep links: `/#bnb` and `/#feeder` open each interactive demo directly.

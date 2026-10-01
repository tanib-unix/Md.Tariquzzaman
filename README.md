# Md Tariquzzaman - Portfolio

Static site for GitHub Pages. The "database" is four JSON files in `data/`; the admin panel at `/admin/` edits them and commits to the repo through the GitHub API.

## Publish
1. Create a GitHub repo (for example `tariquzzaman.github.io` or `portfolio`) and push the contents of this folder to `main`.
2. Repo Settings > Pages > Deploy from branch > `main` / root.
3. Site goes live at `https://<user>.github.io/<repo>/`.

## Admin (add or edit data)
1. Create a fine-grained token at https://github.com/settings/personal-access-tokens/new limited to this repo, permission **Contents: Read and write**.
2. Open `/admin/`, enter owner, repo, branch and token, then Connect.
3. Edit Profile, Experience, Projects or Certifications (images upload from the form), then press **Publish changes**. Pages rebuilds in about a minute.

The token is stored only in your browser; Sign out removes it. Never commit it.

## Local preview
`python -m http.server 8000` in this folder, then open http://localhost:8000

# rawkrabbit.com

The site for **RawkRabbit**, a workshop for small, useful things.

Built with [Astro](https://astro.build) and hosted on Cloudflare. Every merge to `main` deploys automatically. Pull requests get a preview link.

## Add or update a project

Each project is one file in `src/content/projects/`. Copy an existing one, change the details, and set:

| Field | What it is |
|---|---|
| `name` | Project name, as people should say it |
| `tagline` | One line on what it does |
| `kind` | Apple Watch app, Website, etc. |
| `status` | `idea`, `building`, `beta`, `live` or `retired` |
| `problem` / `forWho` | The problem it solves, and who it's for |
| `links` | Buttons. Mark the main one `primary: true` |
| `support` | Optional Buy Me a Coffee style link |
| `draft: true` | Hide it from the site |

The text below the `---` lines is the page body (What it does, What's next).

## Add a log entry

One file in `src/content/log/`, named `YYYY-MM-DD-short-title.md`. Set `project:` to a project's file name (without `.md`) to link them.

## Run it locally

```
npm install
npm run dev
```

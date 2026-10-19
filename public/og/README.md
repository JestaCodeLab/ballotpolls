# Share-preview (Open Graph) images

These are the pictures that appear when a link to the website is shared on WhatsApp, Facebook, X, LinkedIn and so on.

**Size:** 1200 × 630 pixels (about 1.9 : 1). **Format:** PNG or JPG, under 300 KB so it loads fast on phones.
Keep the important part (logo and headline) in the middle 80%, because some apps crop the edges.

| File | Used for |
| --- | --- |
| `default.png` | Any page without its own picture. |
| `home.jpg` | The home page (`/`). Made from the home banner. |
| `events.png` | The elections list (`/events`). |

The files here now are plain placeholders. Replace them with real artwork using the same file names.

**Election pages need nothing in this folder.** Each election page, and each candidate page inside it, uses that election's own
cover image as its share preview.

Set `VITE_SITE_URL` (for example `https://ballotpolls.example.com`) in `client/.env`, because share previews need full web addresses.

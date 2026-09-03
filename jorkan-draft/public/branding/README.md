# League branding

Drop the league's logo in this folder and it replaces the drawn shield in the
header and on the pre-draft screen. Any of these names works, tried in this
order:

    league-logo.png   league-logo.jpg   league-logo.jpeg
    league-logo.webp  league-logo.svg   logo.png   logo.jpg

The whole file is drawn, never cropped, so any shape is safe; something close
to square sits best next to the wordmark. Roughly 512x512 or larger looks
right on a 4K television.

It has to be **committed and pushed**. The presentation is served from Vercel
now, so a file that only exists on somebody's laptop does not exist for the
television opening the URL. The fastest way in is GitHub's own uploader:

    https://github.com/Guillechu/jorkan-draft/upload/main/public/branding

Drag the file in, commit to `main`, and Vercel rebuilds on its own.

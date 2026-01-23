# Creating a custom MSE Hub

Follow these instructions to set up your own MSE Hub.

## Prerequisites

### Install Github Desktop

This isn't strictly necessary, but promise me, it'll make your life a lot easier. You can get GH Desktop [here](https://desktop.github.com/download/).

### Install Python

This one *is* strictly necessary, as the script that builds the entire site is written in Python. You can get it [here](https://www.python.org/downloads/).

## Step 1: Fork me

If you're reading this, you're probably already here, but in case you aren't, navigate to https://github.com/magictheegg/mse-hub/. At the top, click the "Fork" button to start creating your own fork of the code.

![Fork](https://github.com/magictheegg/mse-hub-readme/blob/main/fork.png?raw=true)

On the next page, **change the "Repository name" field** to \<your-github-username>.github.io. This is **critical** for making your code actually deploy to Github sites. You can add a Description if you want. Keep "Copy the `main` branch only" checked. Once you've renamed the repository, click "Create fork".

![Fork part 2](https://github.com/magictheegg/mse-hub-readme/blob/main/fork-part-two.png?raw=true)

Once the fork is created, you'll see the code in Github. Now it's time to move to Github desktop.

Once you've logged into Github Desktop, click File => Clone repository ... and you should see your forked repository in the repo list. Click it, then choose clone. When the "How are you planning to use this fork?" modal pops up, select "For my own purposes," then Continue.

![How are you planning to use this fork?](https://github.com/magictheegg/mse-hub-readme/blob/main/how-fork.png?raw=true)

Finally, in the bar along the top, select "Fetch origin" to pull the origin into your forked repo.

## Step 2: Exporting set files

> :memo: **Note:** This exporter uses the "Title" and "Set code" entered in the "Set info" tab of your MSE set. If those aren't set, the exporter will exhibit strange behavior.

In the resources folder of your cloned repo, you'll find the "magic-egg-allinone" exporter. Copy that into the "data" folder of MSE, then open the program. Open a set you'd like to export, then click File => Export => HTML ... and select Egg's All-in-One. This will export all of your site files.

The options you can select are as follows:
- **Export images**: Defaults to "Yes". Only change this if for some reason you don't need images with your export.
- **Image type**: Defaults to "Png". Github Pages sites can only host 1 GB of data before they start to error out, so if you're doing large exports, consider exporting some or all sets as "Jpg".
- **Symbol rarity**: Defaults to "Rare". This is the rarity color that your symbol icons will export as.
- **Draft structure**: Defaults to "Play booster". If your set is following a different booster structure, set it here. This is editable with a custom JSON while building the site.
- **Formats**: This is a text field where you can enter any custom formats your set is a part of, which can be queried in your site's search.
- **V mana replacement**: If you're using a custom V mana symbol, insert it here.

Once each of these options is filled out, click OK and save the set file as "\<set_code>.txt". (This should match the "Set code" in your "Set info" tab.) This will take a second as the application exports all your images, and the end result is two outputs:
- **\<code>.txt**, which is irrelevant.
- **\<code>-files**, a directory containing all the files necessary to publish your set onto your hub.

## Step 3: Generating the site

Surprisingly, you're almost done! Copy the "\<code>-files" folder (the entire directory) into the "sets" folder of your GitHub checkout. Open Github Desktop, and you should see that directory in the "Changes" sidebar. Click Repository => Open in Terminal (or Command Prompt for Windows machines).

In the opened terminal, execute the following commands:

```
git config --global http.postBuffer 157286400
python3 -m pip install pillow markdown
```

This updates your buffer so you can upload all of your images with no timeout issues and installs required packages. Otherwise, git sometimes gets tired and quits somewhat arbitrarily. You only need to do this ONCE. Afterwards, execute:

```
python3 scripts/build_site.py
```

> :memo: **Note:** If at this point `python3` prompts you to install through the Windows Store, do so. It's the path of least resistance.

> :memo: **Note:** If `python3` can't be found, try running the same command with `py` or `python` instead.

This will spit out a bunch of confirmation lines for different site elements being built. The first time it runs, it will take a few minutes to process through each image. Subsequent runs will be much quicker, unless you update the images with new files. After the command finishes, navigate back to Github desktop and you should see plenty of new artifacts in the "Changes" sidebar. In the bottom left, type a title for your change (this is for versioning), then click "Commit to main". Once you've done so, a big "Push origin" button will appear in the middle of the window. Click that, wait for the push to finish, and voila! Your site is deployed.

To track the process of your site deployment, navigate to https://github.com/USERNAME/USERNAME.github.io/actions, replacing USERNAME with your Github username. Each time you push to origin, a deployment action will trigger, and once that's complete your site will be visible at https://<username>.github.io.

## Future MSE Set Hub Updates

To get updates to the scripts or resources, from Github Desktop, select "Fetch origin" in the bar along the top and wait for that process to complete. Once it's done, select "Current branch" in the same bar, then at the bottom of the opened menu click "Choose a branch to merge into **main**". On the next modal, select "upstream/main", then click "Create a merge commit". This will bring all new code in the main repo into your forked repo, and it will be ready to push the next time you push the contents of your site to main.

If it's indicated that the new change comes with a change to the exporter, you can find the updated exporter in the `resources` directory. Make sure to copy it into your MSE's `data` folder.

---

# Active Features & Customization

If you want to get fancy with your Hub, this is where the real power lies. Most of these features can be triggered by adding special text to your card data or dropping files into specific folders.

## 1. Mastering the Search Engine

The search bar is smarter than it looks. It supports a robust syntax similar to Scryfall for filtering your sets.

### Boolean Logic & Grouping
*   **AND**: Just use a space or `+`. `t:creature c:w` finds White creatures.
*   **OR**: Use `or`. `t:instant or t:sorcery` finds both.
*   **NOT**: Use a minus sign `-`. `-t:land` finds non-lands.
*   **Grouping**: Use parentheses `(...)`. `t:creature (c:b or c:r)` finds Black or Red creatures.

### Numerical Stats
You can use `:`, `=`, `>`, `<`, `>=`, or `<=` with any number-based field:
*   **Mana Value**: `mv:3` or `cmc=3`.
*   **Power/Toughness**: `pow>5`, `tou<2`.
*   **Loyalty**: `loyalty:4`.

### Colors & Identity
*   **Color**: `c:wu` (White-Blue), `c:m` (Multicolored), `c:3` (Exactly 3 colors).
*   **Guilds/Shards**: `c:boros`, `id:esper`, `c:azorius`.
*   **Identity**: `id:rg` or `ci:rg`.

### Advanced Queries
*   **Oracle Text**: `o:"draw a card"`.
*   **Regex**: For the real pros, use slashes for regex oracle search. `o:/[0-9] damage/`.
*   **Lore**: `lore:Akroma` searches the card name AND the flavor text.
*   **Keywords**: `has:flying` or `kw:cycling`.
*   **Shortcuts**: `is:permanent`, `is:spell`, `is:commander`, `is:hybrid`.
*   **Artist/Flavor**: `a:"John Avon"`, `ft:destiny`.
*   **Godzilla/Alias**: `alias:Godzilla` or `godzilla:Biollante`.

## 2. Card Notes (`notes` field magic)

In your MSE set's JSON, every card has a `"notes"` field. Typing these commands (usually starting with `!`) lets you control how they render or sort.

### Site & Search Logic
*   **`!group [Name]`**: Pulls the card into a specific section in the visual preview.
*   **`!sort [Value]`**: Overrides alphabetical sorting. Use `!sort 01`, `!sort 02`, etc., to manually order cards within a group. (Default sorting is `zzz`).
*   **`!tag [Name]`**: Adds a tag searchable via `tag:Name`.
*   **`!tag<category> [Value]`**: Create custom categories. Adding `!tag<mechanic> cycling` means a user can find the card by searching `mechanic:cycling`.
*   **`cube:[Name]`**: Flags the card for a specific cube search (`cube:Name`).

### External Tools (Cockatrice)
*   **`!tokens [Name]<count>`**: Automatically attaches tokens in Cockatrice. Example: `!tokens Elf Warrior<3>;Map<1>`.
*   **`!related [Name]`**: Links another card as "Related."
*   **`!tapped`**: Tells Cockatrice the card enters the battlefield tapped.

## 3. Set-Specific Overrides (`[code]-files` folder)

Every set has a folder at `sets/[SETCODE]-files/`. Dropping files here toggles advanced features for just that set.

### Layout & Branding
*   **`bg.png`**: Automatically becomes the background image for the set's pages.
*   **`logo.png`**: The main banner for the visual preview page.
*   **`splash.md`**: Enables a beautiful Markdown "Splash" page.
    *   **Image Shortcut**: Use `%Card Name%` in your Markdown to embed that card's image automatically.
*   **`card-notes/[Card Name].md`**: Create a Markdown file named after a card, and it will render as "Designer Notes" at the bottom of that card's individual page.

### The Visual Preview Layout (`preview-order.json`)
This file is the "director" of your preview gallery. It's an array of objects:
*   **Standard Group**: `{ "cards": ["Group1"], "title": "Artifacts" }`
    *   The `title` key automatically generates a header and an **Anchor** (`a->`).
*   **Pulling from other sets**: `{ "set": "OTHER", "cards": ["!tag Tag"], "logo": true }`
    *   `logo: true` inserts that set's **Logo Banner** (`l->`).
*   **Content Injection**: `{ "html": "lore.md" }`
    *   Injects a Markdown/HTML **Addenda** (`h->`) directly into the card grid.

### Build Control
*   **`structure.json`**: Overrides the global booster distribution for this set's draft packs.
*   **Booster Mode**: Setting `"draft_structure": "cube"` in your set JSON forces all cards to "Special" rarity for drafting.
*   **`previewed.txt`**: "Spoiler Mode"—list names here, and if the set is in `unpreviewed: empty` mode, only these cards appear.
*   **`ignore.txt`**: Completely hides the set from the search engine and "All Sets" page.
*   **`image_name: position`**: If you don't use the standard `number_name.png` format, add this to your set JSON to look for images by the `"position"` field instead.

## 4. Site-Wide Configuration

### The "Custom" Tree & Mirroring
The **`custom/`** folder is your best friend. The generator mirrors this folder directly to the site root during build.
*   To override a generated file (like `resources/mana.css`), place your version at `custom/resources/mana.css`.
*   To add a site-wide favicon, place it at `custom/img/favicon.png`.

### Home Page Magic
*   **`lists/set-order.json`**: Groups your sets into categories (like "Standard" or "Cube") on the Home page.
*   **`resources/gradients.json`**: Want a new Home page theme? Add two hex codes here. The first entry in the list becomes the site's default background theme.

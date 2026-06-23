import os
import json
import markdown
import re

def generateHTML():
    articles_dir = 'articles'
    if not os.path.exists(articles_dir):
        return

    # Header snippet
    header_snippet = ""
    header_path = os.path.join('scripts', 'snippets', 'header.txt')
    if os.path.exists(header_path):
        with open(header_path, encoding='utf-8-sig') as f:
            header_snippet = f.read()

    for entry in os.scandir(articles_dir):
        if entry.is_dir():
            article_name = entry.name
            article_path = os.path.join(articles_dir, article_name)
            md_path = os.path.join(article_path, 'article.md')
            bg_path = os.path.join(article_path, 'bg.png')
            output_html_file = os.path.join(articles_dir, article_name + '.html')

            if not os.path.exists(md_path):
                print(f"Skipping article {article_name}: article.md not found.")
                continue

            with open(md_path, 'r', encoding='utf-8') as f:
                md_content = f.read()

            # Try to extract title from first H1 in markdown
            title = article_name
            title_match = re.search(r'^#\s+(.*)', md_content, re.MULTILINE)
            if title_match:
                title = title_match.group(1)

            html_body = markdown.markdown(md_content)

            bg_style = ""
            if os.path.exists(bg_path):
                bg_style = f"background-image: url('./{article_name}/bg.png'); background-size: cover; background-attachment: fixed;"
            else:
                bg_style = "background-color: #ffffff;"

            html_content = f'''<html>
<head>
    <title>{title}</title>
    <link rel="icon" type="image/x-icon" href="../img/favicon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../resources/mana.css">
    <link rel="stylesheet" href="../resources/header.css">
    <link rel="stylesheet" href="../resources/card-text.css">
</head>
<script title="root">
    const rootPath = "..";
</script>
<style>
    @font-face {{
        font-family: 'Beleren Small Caps';
        src: url('../resources/beleren-caps.ttf');
    }}
    @font-face {{
        font-family: Beleren;
        src: url('../resources/beleren.ttf');
    }}
    @font-face {{
        font-family: 'Gotham Narrow Black';
        src: url('../resources/gotham-narrow-black.otf');
    }}
    @font-face {{
        font-family: 'Gotham Narrow Bold';
        src: url('../resources/gotham-narrow-bold.otf');
    }}
    @font-face {{
        font-family: 'Gotham Narrow Medium';
        src: url('../resources/gotham-narrow-medium.otf');
    }}
    body {{
        font-family: 'Open Sans', 'Helvetica', 'Arial', sans-serif;
        overscroll-behavior: none;
        margin: 0px;
        {bg_style}
    }}
    .article-container {{
        width: 80%;
        max-width: 900px;
        margin: 40px auto;
        padding: 40px;
        background-color: rgba(255, 255, 255, 0.95);
        border: 1px solid #d5d9d9;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }}
    .article-content img {{
        width: 80%;
        height: auto;
        display: block;
        margin: 20px auto;
    }}
    h4 {{
        font-family: 'Open Sans', sans-serif;
        font-size: 14px;
        font-weight: 400;
        text-align: right;
        width: 80%;
        margin: -15px auto 30px auto;
        color: #666;
        font-style: italic;
    }}
    h1, h2 {{
        margin: 0;
    }}
    h1 {{
        font-family: "Gotham Narrow Bold", Arial, serif;
        font-size: 36px;
        text-align: center;
        margin-top: 20px;
        margin-bottom: 5px;
    }}
    h2 {{
        font-family: "Gotham Narrow Medium", Arial, serif;
        font-size: 32px;
        text-align: center;
        margin-bottom: 20px;
    }}
    p {{
        line-height: 1.6;
        font-size: 16px;
    }}
    hr {{
        margin-top: 30px;
        margin-bottom: 30px;
        border: 0;
        border-top: 1px solid #d5d9d9;
    }}
    </style>
<body>
    {header_snippet}
    <div class="article-container">
        <div class="article-content">
            {html_body}
        </div>
    </div>
    <script>
        document.getElementById("search").addEventListener("keypress", function(event) {{
          if (event.key === "Enter") {{
                event.preventDefault();
                search();
          }}
        }});

        function search() {{
            const url = new URL(rootPath + '/search', window.location.href.split('?')[0].split('/').slice(0, -1).join('/') + '/');
            url.searchParams.append('search', document.getElementById("search").value);
            window.location.href = url.pathname + url.search;
        }}

        function randomCard() {{
            fetch(rootPath + '/lists/all-cards.json')
                .then(response => response.json())
                .then(data => {{
                    const cards = data.cards;
                    const random_card = cards[Math.floor(Math.random() * cards.length)];
                    const url = new URL(rootPath + '/card', window.location.href.split('?')[0].split('/').slice(0, -1).join('/') + '/');
                    const params = {{
                        set: random_card.set,
                        num: random_card.number,
                        name: random_card.card_name
                    }}
                    for (const key in params) {{
                        url.searchParams.append(key, params[key]);
                    }}
                    window.location.href = url.pathname + url.search;
                }}).catch(error => console.error('Error:', error));
        }}
    </script>
</body>
</html>'''

            with open(output_html_file, 'w', encoding='utf-8') as f:
                f.write(html_content)
            print(f"Generated article: {output_html_file}")

if __name__ == "__main__":
    generateHTML()

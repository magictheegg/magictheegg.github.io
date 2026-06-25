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

    article_data = {} # Category -> [Article Info]

    def slugify(text, keep_case=False):
        t = text if keep_case else text.lower()
        pattern = r'[^a-zA-Z0-9\s-]' if keep_case else r'[^a-z0-9\s-]'
        slug = re.sub(pattern, '', t)
        return re.sub(r'\s+', '-', slug).strip('-')

    def process_article(article_path, category):
        md_path = os.path.join(article_path, 'article.md')
        if not os.path.exists(md_path):
            return None

        article_folder_name = os.path.basename(article_path)
        article_slug = slugify(article_folder_name)

        # Use the existing folder's casing if it matches our category name
        # to ensure links work on case-sensitive filesystems like GitHub Pages.
        category_slug = slugify(category, keep_case=True)
        category_dir = os.path.join('articles', category_slug)
        
        if os.path.exists(category_dir):
            # On case-insensitive systems (macOS/Windows), we must find the actual casing
            # on disk to ensure links work correctly on case-sensitive hosts like GitHub.
            try:
                parent_dir = 'articles'
                for entry in os.scandir(parent_dir):
                    if entry.name.lower() == category_slug.lower():
                        category_slug = entry.name
                        category_dir = os.path.join(parent_dir, category_slug)
                        break
            except:
                pass
        else:
            # If the directory doesn't exist yet, we prefer all-lowercase for the new path
            category_slug = slugify(category, keep_case=False)
            category_dir = os.path.join('articles', category_slug)
            if not os.path.exists(category_dir):
                os.makedirs(category_dir)
        
        with open(md_path, 'r', encoding='utf-8') as f:
            md_content = f.read()

        # Simplified: Use folder name for title

        title = article_folder_name.upper()
        subtitle = ""

        first_image = ""
        # Check for card image with priority: png, jpg, jpeg
        found_card_img = False
        for ext in ['png', 'jpg', 'jpeg']:
            card_img_filename = f'card.{ext}'
            card_img_path = os.path.join(article_path, card_img_filename)
            if os.path.exists(card_img_path):
                rel_article_path = os.path.relpath(article_path, '.')
                first_image = os.path.join(rel_article_path, card_img_filename).replace('\\', '/')
                found_card_img = True
                break
        
        if not found_card_img:
            image_match = re.search(r'!\[.*?\]\((.*?)\)', md_content)
            if image_match:
                first_image = image_match.group(1)
                # If relative to article folder, we need to adjust path for all-articles.html
                # all-articles.html is at root, images are in articles/Path/To/Article/img.png
                if not first_image.startswith('http') and not first_image.startswith('/'):
                    # Assuming image path is relative to article.md
                    rel_article_path = os.path.relpath(article_path, '.')
                    first_image = os.path.join(rel_article_path, first_image).replace('\\', '/')

        # Generate individual article HTML with extensions to honor manual <br> tags and newlines
        html_body = markdown.markdown(md_content, extensions=['extra', 'nl2br'])
        
        # Adjust image paths in html_body for individual articles
        # They are now in articles/category-slug/ArticleName.html
        # Original images were in Category/ArticleName/img.png (relative to articles/)
        # So from articles/category-slug/ArticleName.html, we need to go to ../../articles/Category/ArticleName/img.png
        # rel_base_path is the path from articles/ to the article folder
        
        rel_base_path = os.path.relpath(article_path, articles_dir).replace('\\', '/')
        
        def adjust_img_src(match):
            src = match.group(2)
            if not src.startswith('http') and not src.startswith('/') and not src.startswith('data:'):
                return f'<img {match.group(1)}src="../../articles/{rel_base_path}/{src}"'
            return match.group(0)

        html_body = re.sub(r'<img (.*?)src="(.*?)"', adjust_img_src, html_body)

        bg_path = os.path.join(article_path, 'bg.png')
        bg_style = ""
        if os.path.exists(bg_path):
            bg_style = f"background-image: url('../../articles/{rel_base_path}/bg.png'); background-size: cover; background-attachment: fixed;"
        else:
            bg_style = "background-color: #ffffff;"

        # Use rootPath = "../.." for individual articles in /articles/category/
        article_html = f'''<html>
<head>
    <title>{title}</title>
    <link rel="icon" type="image/x-icon" href="../../img/articles.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../../resources/mana.css">
    <link rel="stylesheet" href="../../resources/header.css">
    <link rel="stylesheet" href="../../resources/card-text.css">
</head>
<script title="root">
    const rootPath = "../..";
</script>
<style>
    @font-face {{
        font-family: 'Beleren Small Caps';
        src: url('../../resources/beleren-caps.ttf');
    }}
    @font-face {{
        font-family: Beleren;
        src: url('../../resources/beleren.ttf');
    }}
    @font-face {{
        font-family: 'Gotham Narrow Black';
        src: url('../../resources/gotham-narrow-black.otf');
    }}
    @font-face {{
        font-family: 'Gotham Narrow Bold';
        src: url('../../resources/gotham-narrow-bold.otf');
    }}
    @font-face {{
        font-family: 'Gotham Narrow Medium';
        src: url('../../resources/gotham-narrow-medium.otf');
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
        max-width: 100%;
        height: auto;
        display: block;
        margin: 0;
        object-fit: contain;
        flex: 0 1 auto;
        min-width: 0;
    }}
    .article-content p:has(img) {{
        display: flex;
        flex-wrap: nowrap;
        justify-content: center;
        align-items: center;
        gap: 15px;
        width: 80%;
        margin: 20px auto;
    }}
    /* Only hide BR tags that are immediately between images in a flex row */
    .article-content p:has(img) img + br {{
        display: none;
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

        output_html_file = os.path.join(category_dir, article_slug + '.html')
        with open(output_html_file, 'w', encoding='utf-8') as f:
            f.write(article_html)

        return {
            'title': title,
            'subtitle': subtitle,
            'image': first_image,
            'url': f'articles/{category_slug}/{article_slug}',
            'ctime': os.path.getctime(md_path)
        }

    # Crawl articles directory
    for entry in os.scandir(articles_dir):
        if entry.is_dir():
            # Check if this dir is an article or a category
            md_path = os.path.join(entry.path, 'article.md')
            if os.path.exists(md_path):
                # Top-level article
                category = "General"
                info = process_article(entry.path, category)
                if info:
                    if category not in article_data: article_data[category] = []
                    article_data[category].append(info)
            else:
                # Potential category folder
                category = entry.name
                title_txt_path = os.path.join(entry.path, 'title.txt')
                if os.path.exists(title_txt_path):
                    with open(title_txt_path, 'r', encoding='utf-8') as f:
                        category = f.read().strip()
                
                for subentry in os.scandir(entry.path):
                    if subentry.is_dir():
                        info = process_article(subentry.path, category)
                        if info:
                            if category not in article_data: article_data[category] = []
                            article_data[category].append(info)

    # Sort articles in each category by ctime descending (newest first)
    for category in article_data:
        article_data[category].sort(key=lambda x: x['ctime'], reverse=True)

    # Generate all-articles.html (Top level)
    if len(article_data) > 0:
        generate_index_html(article_data, header_snippet)
        return True
    return False

def generate_index_html(article_data, header_snippet):
    # CSS for scrollable gallery
    # Cards inspired by MTG cards or similar aesthetics? 
    # User said: "cards in a scrollable gallery (left to right, groups stacked top to bottom)"
    
    galleries_html = ""
    for category, articles in article_data.items():
        articles_html = ""
        for article in articles:
            img_path = article["image"]
            if img_path and not img_path.startswith('http') and not img_path.startswith('/'):
                img_path = f"./{img_path}"
            
            # Use subtitle as the main card title if it exists, otherwise use the title
            display_title = article['subtitle'] if article['subtitle'] else article['title']
            
            img_html = f'<div class="article-card-img" style="background-image: url(\'{img_path}\');"></div>' if img_path else '<div class="article-card-img no-img"></div>'
            articles_html += f'''
            <a href="{article['url']}" class="article-card">
                {img_html}
                <div class="article-card-info">
                    <div class="article-card-title">{display_title}</div>
                    <div class="article-card-subtitle" style="display: none;">{article['subtitle']}</div>
                </div>
            </a>'''
        
        galleries_html += f'''
        <div class="gallery-section">
            <h2 class="gallery-category">{category}</h2>
            <div class="gallery-scroll">
                {articles_html}
            </div>
        </div>'''

    index_html = f'''<html>
<head>
    <title>Articles</title>
    <link rel="icon" type="image/x-icon" href="./img/articles.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="./resources/mana.css">
    <link rel="stylesheet" href="./resources/header.css">
</head>
<script title="root">
    const rootPath = ".";
</script>
<style>
    @font-face {{
        font-family: 'Beleren Small Caps';
        src: url('./resources/beleren-caps.ttf');
    }}
    @font-face {{
        font-family: Beleren;
        src: url('./resources/beleren.ttf');
    }}
    @font-face {{
        font-family: 'Gotham Narrow Medium';
        src: url('./resources/gotham-narrow-medium.otf');
    }}
    body {{
        font-family: 'Open Sans', 'Helvetica', 'Arial', sans-serif;
        overscroll-behavior: none;
        margin: 0px;
        background-color: #f3f3f3;
    }}
    .articles-page-container {{
        width: 90%;
        max-width: 1350px;
        margin: 40px auto;
    }}
    .gallery-section {{
        margin-bottom: 50px;
        width: 75%;
        justify-self: center;
    }}
    .gallery-category {{
        font-family: Beleren;
        font-size: 32px;
        margin-bottom: 20px;
        border-bottom: 2px solid #171717;
        padding-bottom: 10px;
    }}
    .gallery-scroll {{
        display: flex;
        overflow-x: auto;
        gap: 20px;
        padding-top: 10px;
        padding-bottom: 20px;
        scrollbar-width: thin;
        scrollbar-color: #171717 #e0e0e0;
    }}
    .gallery-scroll::-webkit-scrollbar {{
        height: 8px;
    }}
    .gallery-scroll::-webkit-scrollbar-track {{
        background: #e0e0e0;
    }}
    .gallery-scroll::-webkit-scrollbar-thumb {{
        background-color: #171717;
        border-radius: 4px;
    }}
    .article-card {{
        flex: 0 0 300px;
        background-color: white;
        border: 1px solid #d5d9d9;
        border-radius: 8px;
        overflow: hidden;
        text-decoration: none;
        color: inherit;
        transition: transform 0.2s, box-shadow 0.2s;
        display: flex;
        flex-direction: column;
    }}
    .article-card:hover {{
        transform: translateY(-5px);
        box-shadow: 0 6px 15px rgba(0,0,0,0.15);
    }}
    .article-card-img {{
        width: 100%;
        height: 180px;
        background-size: cover;
        background-position: center;
        background-color: #ddd;
    }}
    .article-card-img.no-img {{
        background-image: url('./img/card_back.png');
        background-size: contain;
        background-repeat: no-repeat;
    }}
    .article-card-info {{
        padding: 15px;
        flex-grow: 1;
        display: flex;
        flex-direction: column;
    }}
    .article-card-title {{
        font-family: 'Gotham Narrow Medium', sans-serif;
        font-size: 20px;
        line-height: 1.2;
    }}
    .article-card-subtitle {{
        font-size: 14px;
        color: #666;
        line-height: 1.4;
    }}
</style>
<body>
    {header_snippet}
    <div class="articles-page-container">
        {galleries_html}
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

    with open('all-articles.html', 'w', encoding='utf-8') as f:
        f.write(index_html)
    print("Generated all-articles.html")

if __name__ == "__main__":
    generateHTML()

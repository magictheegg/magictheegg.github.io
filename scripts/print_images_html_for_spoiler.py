import os
import sys

gh_user = 'magictheegg'
codes = [ 'SHF', 'GSS', 'KND', 'NJB' ]
#gh_user = 'timespiraled'
#codes = [ 'MC25' ]

def generate_html(img_dir, output_html_file, magic_card_back_image, set_code):

    set_img_dir = os.path.join(img_dir, set_code)
    previewed = [file for file in os.listdir(set_img_dir)]
    
    with open(os.path.join('lists', set_code + '-list.txt')) as f:
        cards = [card.rstrip() for card in f]

    # Start creating the HTML file content
    html_content = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">  
    <link rel="preload" href="img/''' + set_code + '''/bg.png" as="image"> 
    <link rel="preload" href="img/card_back.png" as="image">
    <link rel="preload" href="img/flip.png" as="image">
    <link rel="icon" type="image/png" href="img/''' + set_code + '''/icon.png"/>
    <title>''' + set_code + ''' visual spoiler</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            overscroll-behavior: none;
            background-image: url('img/''' + set_code + '''/bg.png');
            background-size: cover;
            background-attachment: fixed;
        }
        .main-content {
            position: relative;
            width: 100%;
            float: left;
            z-index: 2;
        }
        .sidebar {
            position: sticky;
            top: 0;
            display: none;
            text-align: center;
            padding-right: 2.5%;
            z-index: 1;
        }
        .sidebar img {
            vertical-align: middle;
            max-width: 100%;
            width: 30%;
        }
        .sidebar .btn {
          background: url('img/close.png') no-repeat;
          background-size: contain;
          background-position: center;
          width: 10%;
          height: 10%;
          border: none;
          cursor: pointer;
          position: absolute;
          right: -1.5%;
        }
        .sidebar .btn:hover {
          background: url('img/close-hover.png') no-repeat;
          background-size: contain;
          background-position: center;
          width: 10%;
          height: 10%;
          border: none;
          cursor: pointer;
          position: absolute;
          right: -1.5%;
        }
        .grid-container {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
            gap: 1px;
            padding-left: 5%;
            padding-right: 5%;
            padding-bottom: 3%;
            justify-items: center;
        }
        .grid-container img {
            width: 100%;
            height: auto;
            display: block;
            visibility: hidden;
            cursor: pointer;
        }
        .banner {
            width: 100%;
            height: auto;
            padding-top: 20px;
            padding-bottom: 50px;
        }
        .logo {
            display: block;
            margin: auto;
            width: 40%;
        }
        .container {
          position: relative;
          width: 100%;
        }
        .container img {
          width: 100%;
          height: auto;
        }
        .container .btn {
          background: url('img/flip.png') no-repeat;
          background-size: contain;
          background-position: center;
          width: 15%;
          height: 11%;
          cursor: pointer;
          border: none;
          position: absolute;
          top: 6.5%;
          left: 8.5%;
          transform: translate(-50%, -50%);
        }
        .container .btn:hover {
          background: url('img/flip-hover.png') no-repeat;
          background-size: contain;
          background-position: center;
          width: 15%;
          height: 11%;
          cursor: pointer;
          border: none;
          position: absolute;
          top: 6.5%;
          left: 8.5%;
          transform: translate(-50%, -50%);
        }
        .icon-bar {
            display: grid;
            grid-template-columns: 3fr 2fr 3fr 2fr 3fr 2fr 3fr 2fr 3fr 2fr 3fr 2fr 3fr 2fr 3fr;
            gap: 1px;
            padding-left: 5%;
            padding-right: 5%;
            padding-top: 2%;
            padding-bottom: 1%;
            justify-items: center;
            align-items: center;
        }
        .icon-bar .icon img {
            width: 90%;
            height: auto;
            display: block;
            padding: 5%;
            margin: auto;
            text-align: center;
        }
        .icon-bar .dot img {
            width: 50%;
            height: auto;
            display: block;
            margin: auto;
            text-align: center;
        }
        /* This is here to enable the stickiness in a Float environment. I don't know why it works but it does */
        .footer {
            clear: both;
        }
    </style>
</head>
<body>
    <div class="icon-bar">
    '''

    for code in codes:
        prev_path = os.path.join(img_dir, code, 'prev_icon.png')
        if codes[0] != code:
            html_content += '       <div class="dot"><img src="img/dot.png"></img></div>\n'
        html_content += f'      <div class="icon"><a href="{code}_spoiler.html"><img src="img/{code}/' + ('prev_' if os.path.isfile(prev_path) else '') + 'icon.png"></img></a></div>\n'

    html_content += '''
        </div>
        <div class="banner">
        <img class="logo" src="img/''' + set_code + '''/logo.png">
        </div>
        <div class="main-content" id="main-content">
            <div class="grid-container">
    '''

    # Loop over each image and create an img tag for each one
    card_num = 0
    for card_name in cards:
        card_path = card_name + '.png'
        image_path = os.path.join('img', set_code, card_path)
        card_num = card_num + 1

        # used for DFCs only
        dfc_front_path = card_name + '_front.png'
        dfc_back_path = card_name + '_back.png'
        dfc_front_img_path = os.path.join('img', set_code, dfc_front_path)
        dfc_back_img_path = os.path.join('img', set_code, dfc_back_path)

        flag = '@N'
        if card_path in previewed:
            flag = '@X'
        if dfc_front_path in previewed:
            flag = '@XD'
        if card_name == 'e':
            flag = '@E'
        if card_name == 'er':
            flag = '@ER'

        if flag == '@XD':
            html_content += f'          <div class="container"><img src="{dfc_front_img_path}" data-alt_src="{dfc_back_img_path}" alt="{card_num}" id="{card_num}" data-flag="{flag}" onclick="openSidebar({card_num})"><button class="btn" onclick="imgFlip({card_num})"></button></div>\n'
        else:
            html_content += f'          <div class="container"><img src="{image_path}" alt="{card_num}" id="{card_num}" data-flag="{flag}" onclick="openSidebar({card_num})"></div>\n'

    # Closing the div and the rest of the HTML
    html_content += '''    </div>\n'''

    add_path = os.path.join('addenda', set_code + '-addendum.html')
    if os.path.isfile(add_path):
        with open(add_path) as f:
            for line in f:
                html_content += line

    html_content+='''</div>
    <div class="sidebar" id="sidebar">
        <img id="sidebar_img" src="img/er.png"></img>
        <button class="btn" onclick="closeSidebar()"></button>
    </div>
    <div class="footer"></div>

    <script>
        // Function to apply logic based on the data-flag
        document.addEventListener("DOMContentLoaded", function () {{
            const images = document.querySelectorAll('.grid-container img');

            images.forEach(img => {{
                const flag = img.getAttribute('data-flag');

                if (flag === '@N') {{
                    img.src = 'img/card_back.png';
                    img.removeAttribute("onclick");
                    img.style.cursor = 'default';
                }}

                if (flag === '@E') {{
                    img.src = 'img/e.png';
                    img.removeAttribute("onclick");
                    img.style.cursor = 'default';
                }}

                if (flag === '@ER') {{
                    img.src = 'img/er.png';
                    img.removeAttribute("onclick");
                    img.style.cursor = 'default';
                }}

                img.style.visibility = 'visible';
            }});

        }});

    window.addEventListener('resize', function(event) {{
        setSidebarTop();
    }}, true);

    function setSidebarTop() {{
        let vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        let sh = document.getElementById('sidebar').offsetHeight;
        let height = 100 * ((vh - sh) / 2) / vh;
        document.getElementById('sidebar').style.top = height + '%';
    }}

    function imgFlip(num) {{
        tmp = document.getElementById(num).src;
        document.getElementById(num).src = document.getElementById(num).dataset.alt_src;
        document.getElementById(num).dataset.alt_src = tmp;
    }}

    function openSidebar(id) {{
        scroll_pct = window.scrollY / document.documentElement.scrollHeight;
        
        document.getElementById('sidebar').style.display = 'block';
        document.getElementById('sidebar_img').src = document.getElementById(id).src;
        document.getElementById('main-content').style.width = '60%';
        
        scroll_pos = scroll_pct * document.documentElement.scrollHeight;
        console.log(scroll_pct + ' ' + scroll_pos + ' ' + document.documentElement.scrollHeight);
        window.scrollTo(window.scrollX, scroll_pos);
        setSidebarTop();
    }}

    function closeSidebar() {{
        scroll_pct = window.scrollY / document.documentElement.scrollHeight;

        document.getElementById('sidebar').style.display = 'none';
        document.getElementById('main-content').style.width = '100%';
        

        scroll_pos = scroll_pct * document.documentElement.scrollHeight;
        window.scrollTo(window.scrollX, scroll_pos);
    }}
    </script>
</body>
</html>
'''.format(magic_card_back_image)

    # Write the HTML content to the output HTML file
    with open(output_html_file, 'w') as file:
        file.write(html_content)

    print(f"HTML file saved as {output_html_file}")

# Usage
# You must have exported the card images (as.png) to input_directory and to image_directory.
for set_code in codes:
    img_dir = "../img/" # Relative to this script (can be made point to the same directory as input_directory)
    output_html_file = "../" + set_code + "_spoiler.html" # Relative to this script
    magic_card_back_image = "../img/card_back.png" # Relative to output_html_file directory
    generate_html(img_dir, output_html_file, magic_card_back_image, set_code)
